# Paydock Payment Connector for commercetools

## Overview

The Paydock Payment Connector allows seamless integration between your commercetools platform and Paydock, enhancing your payment management processes. This repository contains two primary modules:

### Extension Module
Acts as middleware to connect commercetools with Paydock. It triggers on payment creation and updates within commercetools to ensure efficient event handling by Paydock.
- [Integration Guide](../extension/docs/IntegrationGuide.md): Detailed steps to integrate this module with commercetools.
- [How to Run](../extension/docs/HowToRun.md): Instructions for deploying and running the extension module.

### Notification Module
Manages asynchronous notifications from Paydock about payment status changes (e.g., authorization, charge, refund). It updates the corresponding payment status in commercetools.
- [Integration Guide](../notification/docs/IntegrationGuide.md): Information on integrating this module with commercetools.
- [How to Run](../notification/docs/HowToRun.md): Instructions for deploying and running the notification module.

**Important**: Both modules are required to fully integrate your commercetools setup with Paydock.

## Additional Resources
- [Paydock Commercetools Widget](https://github.com/PayDock/e-commerce-commercetools-npm)
- [Paydock Commercetools Custom Application](https://github.com/PayDock/e-commerce-commercetools-app/)
- [Official Paydock Website](https://paydock.com/)

## License
This project is licensed under the [MIT License](LICENSE).