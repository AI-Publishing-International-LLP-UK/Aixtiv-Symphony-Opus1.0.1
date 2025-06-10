/**
 * Gateway Services Index
 * Exports all gateway implementation classes
 */

const BaseGateway = require('./BaseGateway');
const OwnerSubscriberGateway = require('./OwnerSubscriberGateway');
const TeamGateway = require('./TeamGateway');
const GroupGateway = require('./GroupGateway');
const PractitionerGateway = require('./PractitionerGateway');
const EnterpriseGateway = require('./EnterpriseGateway');

/**
 * Export all gateway classes
 */
module.exports = {
  BaseGateway,
  OwnerSubscriberGateway,
  TeamGateway,
  GroupGateway,
  PractitionerGateway,
  EnterpriseGateway
};

