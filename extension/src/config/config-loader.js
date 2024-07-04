// import rc from 'rc'
import {config} from "dotenv";

function loadConfig() {
  config();
  if (process.env.PAYDOCK_INTEGRATION_CONFIG) {
    return loadFromPaydockIntegrationEnvVar()
  }
  return {}
}

function loadFromPaydockIntegrationEnvVar() {
  try {
    return JSON.parse(process.env.PAYDOCK_INTEGRATION_CONFIG)
  } catch (e) {
    throw new Error(
        `Paydock integration configuration is not provided in the JSON format`,
    )
  }
}

export { loadConfig }
