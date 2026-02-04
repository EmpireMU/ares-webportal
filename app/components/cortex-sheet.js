import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { pushObject, removeObject } from 'ares-webportal/helpers/object-ext';

export default Component.extend({
  gameApi: service(),
  flashMessages: service(),
  tagName: '',
  isEditing: false,
  editSheet: null,
  editPlotPoints: null,

  defaultDieFor(section) {
    switch (section) {
      case 'attributes':
        return 'd6';
      case 'skills':
        return 'd4';
      case 'distinctions':
        return 'd8';
      default:
        return 'd6';
    }
  },

  @action
  startEdit() {
    let sheet = JSON.parse(JSON.stringify(this.cortex.sheet || {}));
    this.set('editSheet', sheet);
    this.set('editPlotPoints', this.cortex.plot_points || 0);
    this.set('isEditing', true);
  },

  @action
  cancelEdit() {
    this.set('isEditing', false);
    this.set('editSheet', null);
  },

  @action
  addTrait(section) {
    let sheet = this.editSheet;
    if (!sheet[section]) {
      sheet[section] = [];
    }
    pushObject(sheet[section], {
      name: '',
      die: this.defaultDieFor(section),
      desc: ''
    }, this, 'editSheet');
  },

  @action
  removeTrait(section, trait) {
    let sheet = this.editSheet;
    if (!sheet[section]) {
      return;
    }
    removeObject(sheet[section], trait, this, 'editSheet');
  },

  @action
  saveSheet() {
    let api = this.gameApi;
    api.requestOne('cortexUpdateSheet', {
      id: this.char.name,
      sheet: this.editSheet,
      plot_points: this.editPlotPoints
    }, null).then((response) => {
      if (response.error) {
        return;
      }
      this.flashMessages.success('Cortex sheet saved.');
      this.set('isEditing', false);
      if (this.onReloadChar) {
        this.onReloadChar();
      }
    });
  }
});
