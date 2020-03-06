Introduction
============

The oHealthCxt-Browser widget allows you to browser Cosmos data. This is done using an extension called
Bifrost which is implemented over python language.

> Latest version of this widget is always provided in 
> [GitHub](https://github.com/netzahdzc/Bifrost).

Settings
--------

### Settings

- **NGSI server URL:** URL of the Bifrost to use for retrieving
  entity information.
- **Use the FIWARE credentials of the dashboard owner**: Use the FIWARE
  credentials of the owner of the workspace. This preference takes preference
  over "Use the FIWARE credentials of the user". This feature is available on
  WireCloud 0.7.0+ in an experimental basis, future versions of WireCloud can
  change the way to use it, making this option not funcional and requiring you to
  upgrade this operator.
- **NGSI tenant/service**: Tenant/service to use when connecting to the context
  broker. Must be a string of alphanumeric characters (lowercase) and the `_`
  symbol. Maximum length is 50 characters. If empty, the default tenant will be
  used
- **NGSI scope**: Scope/path to use when connecting to the context broker. Must
  be a string of alphanumeric characters (lowercase) and the `_` symbol
  separated by `/` slashes. Maximum length is 50 characters. If empty, the
  default service path will be used: `/`
- **NGSI entity types:** A comma-separated list of entity types to use for
  filtering entities from the Orion Context broker. This field cannot be empty.
- **Extra Attributes:** Comma separated list of attributes to be displayed in
  the widget as extra columns.

### Wiring

##### Input Endpoints

* This widget has no input endpoint

##### Output Endpoints

-   **Selection:** This widget sends an event thought this endpoint when the
    user clicks on the "Use Button". Entities using this operator uses the flat
    option of the WireCloud API. Event data example:

    ```json
    {
        "id": "van4",
        "type": "Van",
        "current_position": "43.47173, -3.7967205"
    }
    ```
