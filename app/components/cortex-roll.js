import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { action, computed } from '@ember/object';
import { pushObject, removeObject } from 'ares-webportal/helpers/object-ext';

export default Component.extend({
  gameApi: service(),
  flashMessages: service(),
  tagName: '',
  useBuilder: true,
  selectRoll: null,
  destinationType: 'standalone',
  poolString: '',
  difficulty: null,
  keepExtra: false,
  rollResult: null,
  selectedAttribute: null,
  selectedSkill: null,
  selectedDistinction: null,
  attributeMod: null,
  skillMod: null,
  distinctionMod: null,
  attributeDouble: false,
  skillDouble: false,
  distinctionDouble: false,
  extraTraits: null,

  parseDicePool(poolString) {
    if (!poolString) {
      return [];
    }
    let matches = poolString.match(/\d+/g);
    if (!matches) {
      return [];
    }
    return matches.map((m) => parseInt(m, 10)).filter((n) => !isNaN(n));
  },

  init() {
    this._super(...arguments);
    if (!this.extraTraits) {
      this.set('extraTraits', []);
    }
    if (!this.cortex || !this.cortex.sheet) {
      this.set('useBuilder', false);
    }
  },

  hasSheet: computed('cortex.sheet', function() {
    return this.cortex && this.cortex.sheet;
  }),

  useModal: computed('selectRoll', function() {
    return this.selectRoll !== undefined && this.selectRoll !== null;
  }),

  findTrait(section, name) {
    let sheet = this.cortex && this.cortex.sheet ? this.cortex.sheet : {};
    let list = sheet[section] || [];
    return list.find((t) => t.name === name);
  },

  stepDie(die, steps) {
    let sizes = this.cortex && this.cortex.dice_sizes ? this.cortex.dice_sizes : [4, 6, 8, 10, 12];
    let idx = sizes.indexOf(die);
    if (idx < 0) {
      return die;
    }
    let newIdx = idx + steps;
    if (newIdx < 0) {
      newIdx = 0;
    }
    if (newIdx > sizes.length - 1) {
      newIdx = sizes.length - 1;
    }
    return sizes[newIdx];
  },

  dieFromTrait(trait, mod) {
    if (!trait || !trait.die) {
      return null;
    }
    let die = parseInt(trait.die.replace('d', ''), 10);
    if (mod === 'D') {
      if (trait.section === 'distinctions') {
        die = 4;
      } else {
        die = this.stepDie(die, -1);
      }
    }
    if (mod === 'U') {
      die = this.stepDie(die, 1);
    }
    return die;
  },

  addDice(dice, die, doubled) {
    if (!die) {
      return;
    }
    dice.push(die);
    if (doubled) {
      dice.push(die);
    }
  },

  buildDicePool() {
    let dice = [];
    if (!this.selectedAttribute || !this.selectedSkill || !this.selectedDistinction) {
      this.flashMessages.danger('Select an Attribute, Skill, and Distinction.');
      return null;
    }
    let attrTrait = this.findTrait('attributes', this.selectedAttribute);
    let skillTrait = this.findTrait('skills', this.selectedSkill);
    let distTrait = this.findTrait('distinctions', this.selectedDistinction);
    if (attrTrait) {
      attrTrait.section = 'attributes';
    }
    if (skillTrait) {
      skillTrait.section = 'skills';
    }
    if (distTrait) {
      distTrait.section = 'distinctions';
    }
    this.addDice(dice, this.dieFromTrait(attrTrait, this.attributeMod), this.attributeDouble);
    this.addDice(dice, this.dieFromTrait(skillTrait, this.skillMod), this.skillDouble);
    this.addDice(dice, this.dieFromTrait(distTrait, this.distinctionMod), this.distinctionDouble);

    (this.extraTraits || []).forEach((extra) => {
      if (!extra.section || !extra.name) {
        return;
      }
      let trait = this.findTrait(extra.section, extra.name);
      if (!trait) {
        return;
      }
      trait.section = extra.section;
      this.addDice(dice, this.dieFromTrait(trait, extra.mod), extra.doubled);
    });

    return dice;
  },

  buildPoolLabel() {
    if (!this.useBuilder) {
      return this.poolString || "";
    }
    let parts = [];
    let formatTrait = (name, mod, doubled) => {
      if (!name) {
        return "";
      }
      let suffix = "";
      if (mod === 'U') {
        suffix += " (U)";
      }
      if (mod === 'D') {
        suffix += " (D)";
      }
      if (doubled) {
        suffix += " (Doubled)";
      }
      return `${name}${suffix}`;
    };
    parts.push(formatTrait(this.selectedAttribute, this.attributeMod, this.attributeDouble));
    parts.push(formatTrait(this.selectedSkill, this.skillMod, this.skillDouble));
    parts.push(formatTrait(this.selectedDistinction, this.distinctionMod, this.distinctionDouble));
    (this.extraTraits || []).forEach((extra) => {
      parts.push(formatTrait(extra.name, extra.mod, extra.doubled));
    });
    return parts.filter(p => p).join(", ");
  },

  @action
  setSelectRoll(value) {
    this.set('selectRoll', value);
  },

  @action
  addExtraTrait() {
    pushObject(this.extraTraits, {
      section: 'resources',
      name: null,
      mod: null,
      doubled: false
    }, this, 'extraTraits');
  },

  @action
  removeExtraTrait(trait) {
    removeObject(this.extraTraits, trait, this, 'extraTraits');
  },

  @action
  rollDice() {
    let dice;
    let poolLabel = this.buildPoolLabel();
    if (this.useBuilder) {
      dice = this.buildDicePool();
      if (!dice) {
        return;
      }
    } else {
      dice = this.parseDicePool(this.poolString);
      if (!dice.length) {
        this.flashMessages.danger('Enter a dice pool like "d8 d10 d6".');
        return;
      }
    }
    let api = this.gameApi;
    let command = 'cortexRoll';
    let args = {
      dice: dice,
      difficulty: this.difficulty,
      keep_extra: this.keepExtra,
      pool_label: poolLabel
    };
    if (this.destinationType === 'scene' && this.scene) {
      command = 'cortexAddSceneRoll';
      args.id = this.scene.id;
    } else if (this.destinationType === 'job' && this.job) {
      command = 'cortexAddJobRoll';
      args.id = this.job.id;
    }

    api.requestOne(command, args, null).then((response) => {
      if (response.error) {
        return;
      }
      if (command === 'cortexRoll') {
        this.set('rollResult', response);
      } else {
        this.set('rollResult', null);
        if (this.useModal) {
          this.set('selectRoll', false);
        }
      }
    });
  }
});
