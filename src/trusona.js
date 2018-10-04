const request = require('request-promise')
const errors = require('request-promise/errors');
const promisePoller = require('promise-poller').default;
const RequestHelper = require('./RequestHelper')
const ApiCredentials = require('./ApiCredentials')
const WebSdkConfig = require('./WebSdkConfig')
const CreateUserDeviceErrorHandler = require('./CreateUserDeviceErrorHandler')
const ActivateUserDeviceHandler = require('./ActivateUserDeviceHandler')
const GenericErrorHandler = require('./GenericErrorHandler')
const UAT = "uat";
const PRODUCTION = "production"

class Trusona {

  constructor(token, secret, env) {
    this.apiCredentials = new ApiCredentials(token, secret)
    this.requestHelper = new RequestHelper(token, secret, env)
  }

  static get UAT() {
    return UAT;
  }

  static get PRODUCTION() {
    return PRODUCTION;
  }

  createUserDevice(userIdentifier, deviceIdentifier) {
    const options = this.requestHelper.getSignedRequest({
      url: '/api/v2/user_devices',
      method: 'POST',
      transform : (body, response, resolveWithFullResponse) => {
        body.activation_code = body.id;
        return body;
      },
      body: {
        'user_identifier': userIdentifier,
        'device_identifier': deviceIdentifier
      }
    });
    
    return request(options).catch(errors.StatusCodeError, error => {
      return CreateUserDeviceErrorHandler.handleError(error)
    });
  }

  activateUserDevice(activationCode) {
    const options = this.requestHelper.getSignedRequest({
      url: `/api/v2/user_devices/${activationCode}`,
      method: 'PATCH',
      body: { active: true }
    });

    return request(options).catch(errors.StatusCodeError, error => {
      return ActivateUserDeviceHandler.handleError(error)
    });
  }

  createTrusonafication(trusonafication) {
    const options = this.requestHelper.getSignedRequest({
      url: `/api/v2/trusonafications`,
      method: 'POST',
      body : trusonafication
    });
    return request(options);
  }

  getDevice(deviceIdentifier) {
    const options = this.requestHelper.getSignedRequest({
      url: `/api/v2/devices/${deviceIdentifier}`,
      method: 'GET',
      transform : (body, response, resolveWithFullResponse) => {
        body.active = body.is_active;
        return body;
      }
    });
    return request(options);
  }

  deactivateUser(userIdentifier){
    const options = this.requestHelper.getSignedRequest({
      url: `/api/v2/users/${userIdentifier}`,
      method: 'DELETE' });
      return request(options); //TODO: Confirm with Ryan how the UserNotFoundException is being called in java land. 
  }

  getIdentityDocument(document_id) {
    const options = this.requestHelper.getSignedRequest({
      url: `/api/v2/identity_documents/${document_id}`,
      method: 'GET',
      transform : (body, response, resolveWithFullResponse) => {
        body.active = body.is_active;
        return body;
      }
    });

    return request(options).catch(errors.StatusCodeError, error => {
      return GenericErrorHandler.handleError(error)
    });
  }

  findIdentityDocuments(userIdentifier) {
    const options = this.requestHelper.getSignedRequest({
      url: `/api/v2/identity_documents`,
      method: 'GET',
      qs: { user_identifier: userIdentifier }
    });

    return request(options).catch(errors.StatusCodeError, error => {
      return GenericErrorHandler.handleError(error)
    });
  }

  getPairedTruCode(trucode_id){
    const options = this.requestHelper.getSignedRequest({
      url: `/api/v2/paired_trucodes/${trucode_id}`,
      method: 'GET'
    });
    return request(options).catch(errors.StatusCodeError, error => {
      return GenericErrorHandler.handleError(error)
    });
  }

  pollForPairedTruCode(trucode_id, timeout){
    return promisePoller({
      taskFn: this.getPairedTruCode.bind(this, trucode_id),
      interval: 5000,
      timeout: timeout
    }).catch(errors.StatusCodeError, error => {
      return GenericErrorHandler.handleError(error)
    });;
  }

  getWebSdkConfig(){
    var parsedToken = this.apiCredentials.getParsedToken()
    if(parsedToken === null){
      console.log("The provided access token is invalid. Please check your configuration")
    }else{
      const webSdkConfig = new WebSdkConfig(this.requestHelper.baseUrl, parsedToken.sub)
      return JSON.stringify(webSdkConfig)
    }
  } 
}

module.exports = Trusona