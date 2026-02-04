import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class RosterController extends Controller {
  @service gameApi;
  @tracked filterOrg = null;
  @tracked orgRosterData = null;
  @tracked showOrgView = false;
  
  get availableOrgs() {
    return this.model.organisations || [];
  }
  
  @action
  async viewByOrganisation() {
    this.showOrgView = true;
    let response = await this.gameApi.requestOne('rosterByOrganisation', {});
    if (response.error) {
      return;
    }
    this.orgRosterData = response;
  }
  
  @action
  viewByFaction() {
    this.showOrgView = false;
    this.orgRosterData = null;
  }
  
  @action
  async filterByOrg(orgName) {
    if (!orgName) {
      this.filterOrg = null;
      await this.viewByOrganisation();
      return;
    }
    
    this.filterOrg = orgName;
    let response = await this.gameApi.requestOne('rosterByOrganisation', { organisation: orgName });
    if (response.error) {
      return;
    }
    this.orgRosterData = response;
  }
  
  get displayRoster() {
    if (this.showOrgView && this.orgRosterData) {
      return this.orgRosterData.roster;
    }
    return this.model.roster;
  }
}
