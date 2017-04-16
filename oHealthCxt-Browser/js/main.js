/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global NGSI, StyledElements */

(function () {

    "use strict";
    
    /* Constants declaration 
    *  Constant declaration. Answer the question: What module I want to share the data?
    */
    var PARTICIPANTS_MODULE = "Participants";
    var TESTS_MODULE        = "PhysicalTest";
    var PARAMETERS_MODULE   = "ParametersOfInterest";

    /* Setup*/
    var health_module = MashupPlatform.prefs.get('health_module');

    /* Inputdata */
    var qValue = "";
    var qObject = JSON.stringify({ 'q': ["", ""] });

    MashupPlatform.wiring.registerCallback('textinput', function (data) {
        var attribute = "";
        data = JSON.parse(data);

        // Participants module. Action mechanim is focused on retrieve physical test data.
        if(health_module == PARTICIPANTS_MODULE){
            qValue = data.id;
            attribute = "";
        }

        // Physical test module. Action mechanim is focused on retrieve variable of interest data.
        if(health_module == TESTS_MODULE){
            qValue = data.id;
            attribute = "refUser";
        }

        // Variable of interest module
        if(health_module == PARAMETERS_MODULE){
            qValue = data.id;
            attribute = "refEvent";
        }

        if(qValue !== ""){
            localStorage.setItem('qObject',  JSON.stringify({ 'q': [attribute, qValue] }));
            location.reload();
        }
    });

    var DataViewer = function DataViewer() {
        /* Context */
        MashupPlatform.widget.context.registerCallback(function (newValues) {
            if (this.layout && ("heightInPixels" in newValues || "widthInPixels" in newValues)) {
                this.layout.repaint();
            }
        }.bind(this));

        /* Preferences */
        MashupPlatform.prefs.registerCallback(function (newValues) {
            if ('ngsi_server' in newValues || 'use_user_fiware_token' in newValues || 'ngsi_tenant' in newValues || 'ngsi_service_path' in newValues) {
                this.updateNGSIConnection();
            }
            if ('extra_attributes' in newValues || /*'type_column' in newValues || 'allow_delete' in newValues ||*/ 'allow_use') {
                createTable.call(this);
            }
            this.ngsi_source.goToFirst();
        }.bind(this));

        this.layout = null;
        this.table = null;
    };

    DataViewer.prototype.init = function init() {
        createNGSISource.call(this);
        this.updateNGSIConnection();

        this.layout = new StyledElements.BorderLayout();
        createTable.call(this);

        this.layout.getCenterContainer().addClassName('loading');
        this.layout.insertInto(document.body);
        this.layout.repaint();
    };

    DataViewer.prototype.updateNGSIConnection = function updateNGSIConnection() {
        this.ngsi_server = MashupPlatform.prefs.get('ngsi_server');
        var options = {
            request_headers: {},
            use_user_fiware_token: MashupPlatform.prefs.get('use_user_fiware_token')
        };
        var tenant = MashupPlatform.prefs.get('ngsi_tenant').trim().toLowerCase();
        if (tenant !== '') {
            options.request_headers['FIWARE-Service'] = tenant;
        }
        var path = MashupPlatform.prefs.get('ngsi_service_path').trim().toLowerCase();
        if (path !== '' && path !== '/') {
            options.request_headers['FIWARE-ServicePath'] = path;
        }
        var type = MashupPlatform.prefs.get('ngsi_entities').trim();
        options.request_headers['FIWARE-Type'] = type;

        // Retrieve the object from storage
        var retrievedObject = localStorage.getItem('qObject');
        if(retrievedObject == null) localStorage.setItem('qObject', qObject);
        // Send value for the bridge to process respective queue
        options.request_headers['FIWARE-Queue'] = retrievedObject;
        // This need to be done to avoid unwanted specific retrieved from memory when loading a new session
        localStorage.setItem('qObject', qObject);

        this.ngsi_connection = new NGSI.Connection(this.ngsi_server, options);
    };

    /**************************************************************************/
    /****************************** HANDLERS **********************************/
    /**************************************************************************/

    var onRowClick = function onRowClick(row) {
        //MashupPlatform.wiring.pushEvent('selected-row', row);
    };

    var onNGSIQuerySuccess = function onNGSIQuerySuccess(next, page, data, details) {
        var search_info, i, j, attributes, attribute, entry, counter = 0;

        for (i = 0; i < data.length; i++) {
            entry = data[i];
            attributes = {};

            for (j = 0; j < entry.attributes.length; j++) {
                attribute = entry.attributes[j];
                attributes[attribute.name] = attribute.contextValue;
            }
            attributes.id = entry.entity.id;
            attributes.type = entry.entity.type;
            data[i] = attributes;
        }

        search_info = {
            'resources': data,
            'current_page': page,
            'total_count': (details.count-counter)
        };

        next(data, search_info);
    };

    var createNGSISource = function createNGSISource() {
        this.ngsi_source = new StyledElements.PaginatedSource({
            'pageSize': 20,
            'requestFunc': function (page, options, onSuccess, onError) {
                var entityIdList, entityId, types, i, attributes;

                if (this.ngsi_connection !== null) {
                    entityIdList = [];
                    var id_pattern = '';//MashupPlatform.prefs.get('ngsi_id_filter');
                    if (id_pattern === '') {
                        id_pattern = '.*';
                    }
                    types = MashupPlatform.prefs.get('ngsi_entities').trim();
                    if (types !== '') {
                        types = types.split(new RegExp(',\\s*'));
                        for (i = 0; i < types.length; i++) {
                            entityId = {
                                id: id_pattern,
                                type: types[i],
                                isPattern: true
                            };
                            entityIdList.push(entityId);
                        }
                    } else {
                        entityId = {
                            id: id_pattern,
                            isPattern: true
                        };
                        entityIdList.push(entityId);
                    }

                    attributes = MashupPlatform.prefs.get('extra_attributes').trim();
                    if (attributes !== "") {
                        attributes = attributes.split(new RegExp(',\\s*'));
                    } else {
                        attributes = [];
                    }

                    this.ngsi_connection.query(entityIdList, attributes, {
                        details: true,
                        limit: options.pageSize,
                        offset: (page - 1) * options.pageSize,
                        onSuccess: onNGSIQuerySuccess.bind(null, onSuccess, page),
                        onFailure: onError
                    });
                } else {
                    onSuccess([], {resources: [], total_count: 0, current_page: 0});
                }
            }.bind(this)
        });
        this.ngsi_source.addEventListener('requestStart', function () {
            this.layout.getCenterContainer().disable();
        }.bind(this));
        this.ngsi_source.addEventListener('requestEnd', function () {
            this.layout.getCenterContainer().enable();
        }.bind(this));
    };

    var createTable = function createTable() {
        var fields, extra_attributes, i;

        // Create the table
        fields = [
            {field: 'id', label: 'Id', sortable: false}
        ];
        /*if (MashupPlatform.prefs.get('type_column')) {
            fields.push({field: 'type', label: 'Type', sortable: false});
        }*/

        extra_attributes = MashupPlatform.prefs.get('extra_attributes').trim();
        if (extra_attributes !== "") {
            extra_attributes = extra_attributes.split(new RegExp(',\\s*'));
            for (i = 0; i < extra_attributes.length; i++) {
                fields.push({field: extra_attributes[i], sortable: false});
            }
        }

        if (/*MashupPlatform.prefs.get('allow_delete') ||*/ MashupPlatform.prefs.get('allow_use')) {
            fields.push({
                label: 'Actions',
                width: '100px',
                contentBuilder: function (entry) {
                    var content, button;

                    content = new StyledElements.Fragment();

                    /*if (MashupPlatform.prefs.get('allow_delete')) {
                        button = new StyledElements.StyledButton({'class': 'btn-danger', 'iconClass': 'icon-trash', 'title': 'Delete'});
                        button.addEventListener("click", function () {
                            this.ngsi_connection.deleteAttributes(
                                [
                                    {'entity': {id: entry.id, type: entry.type}}
                                ],
                                {
                                    onSuccess: this.ngsi_source.refresh.bind(this.ngsi_source),
                                    onFailure: function (error) {
                                        MashupPlatform.widget.log(error);
                                    }
                                }
                            );
                        }.bind(this));
                        content.appendChild(button);
                    }*/ 

                    if (MashupPlatform.prefs.get('allow_use')) {
                        button = new StyledElements.StyledButton({'class': 'btn-primary', 'iconClass': 'icon-play', 'title': 'Use'});
                        button.addEventListener("click", function () {
                            MashupPlatform.wiring.pushEvent('selection', JSON.stringify(entry));
                        }.bind(this));
                        content.appendChild(button);
                    }

                    return content;
                }.bind(this),
                sortable: false
            });
        }

        this.table = new StyledElements.ModelTable(fields, {id: 'id', pageSize: 20, source: this.ngsi_source, 'class': 'table-striped'});
        this.table.addEventListener("click", onRowClick);
        this.table.reload();
        this.layout.center.clear();
        this.layout.center.appendChild(this.table);
    };

    var data_viewer = new DataViewer();
    window.addEventListener("DOMContentLoaded", data_viewer.init.bind(data_viewer), false);
})();
