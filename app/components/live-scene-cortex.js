import Component from '@ember/component';
import { action } from '@ember/object';

export default Component.extend({
  tagName: '',
  selectCortexRoll: false,

  @action
  setSelectCortexRoll(value) {
    this.set('selectCortexRoll', value);
  }
});
