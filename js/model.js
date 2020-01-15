// This is the matching js file for the model display page

/*
project_id: "39"
field_name: "participant_id"
field_phi: null
form_name: "survey"
form_menu_description: "Example Survey"
field_order: "1"
field_units: null
element_preceding_header: null
element_type: "text"
element_label: "Participant ID"
element_enum: null
element_note: null
element_validation_type: null
element_validation_min: null
element_validation_max: null
element_validation_checktype: "soft_typed"
branching_logic: null
field_req: "0"
edoc_id: null
edoc_display_img: "0"
custom_alignment: null
stop_actions: null
question_num: null
grid_name: null
grid_rank: "0"
misc: null
video_url: null
video_display_inline: "0"
*/


function REDCapField(metadata_row) {

    var field_name, field_phi, field_order, field_units, element_preceding_header, element_type, element_label, element_enum,
        element_note, element_validation_type, element_validation_min, element_validation_max, element_validation_checktype,
        branching_logic, field_req, edoc_id, edoc_display_img, custom_alignment, stop_actions, question_num, grid_name,
        grid_rank, misc, video_url, video_display_inline;
    this['metadata_row'] = metadata_row;

    for (const prop in metadata_row) {
        this[prop] = metadata_row[prop];
    }
}


REDCapField.prototype.foo = function() {
    console.log('bar');
};

REDCapField.prototype.insertRow = function(container) {
    let row = $( this.getRow() );
    row.appendTo(container);
};

REDCapField.prototype.getRow = function(format) {
    let html = [
        '<div class="row">',
        '<div class="col">',
        this.getLabel(),
        '</div>',
        '<div class="col">',
        this.getInput(),
        '</div>',
        '</div>'
    ];
    return html.join('\n');
};

REDCapField.prototype.getLabel = function() {
    return this.element_label;
};

REDCapField.prototype.getInput = function() {
    return 'foo';
};





REDCapRenderer = {
    metadata: {},
    fields: {},

    init: function() {
        this.getMetadata();
    },

    // todo: get metadata for a single form
    getMetadata: function(form_name) {

        $.ajax({
            context: REDCapRenderer,
            method: 'POST',
            data: {
                "action":"getMetadata"
            },
            dataType: 'json'
        }).done(function(data) {
            this.metadata = data;

            // Build the field objects
            this.buildFields();

            this.insertRows($('#redcap_container'));
        });
    },

    buildFields: function() {
        log("Building Fields...");
        for (const field_name in this.metadata) {
            this.fields[field_name] = new REDCapField(this.metadata[field_name]);
        }
        log(this.fields);

    },

    insertRows: function(container) {
        for (const field in this.fields) {
            // console.log(this.fields[field]);
            this.fields[field].insertRow(container);
        }

    }

};