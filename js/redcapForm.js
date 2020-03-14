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

function REDCapField(metadata, parentForm) {
    this['metadata'] = metadata;
    this['parentForm'] = parentForm;
}

REDCapField.prototype.insertRow = function(container) {
    if(this.getRow()){
        let jq_row              = $( this.getRow() );
        this.jq_input           = jq_row.find(":input");
        this.og_parent_classes  = this.jq_input.closest(".bmd-form-group").attr("class"); //will do some class manipulation, so lets remember og state.

        if(!this.metadata["readonly"]) {
            this.bindChange(jq_row);
        }

        jq_row.appendTo(container);
    }
};

REDCapField.prototype.getRow = function(format) {
    //templates are injected (hidden) into the HTML and reused throughout , referenced to by #id

    // yn and tf types are just radio
    var template_suffix = this.getType();
    if(template_suffix == "yesno" || template_suffix == "truefalse"){
        template_suffix = "radio";
    }

    var m_template_type =  "#template_" + template_suffix;
    if($(m_template_type).length){
        var m_template  = $(m_template_type).html();
        var m_nested    = $("#template_nested_top").html();

        /* radio/checkboxes/selects require extra steps to extract options which are "\\n" delimited strings and need massaging
           ... current values absurdly can be an {}, [] or String */
        var enum_result = [];
        if(this.metadata.element_enum !== null) {
            var temp = this.metadata.element_enum.split("\\n");
            for (var i in temp) {
                i           = parseInt(i);  //the # index is a "string"?  make it an int.
                var txt     = temp[i];
                var comma   = txt.indexOf(",");
                var label   = txt.substr(0, comma);
                var value   = txt.substr(comma+1);

                var checked_selected = "";
                var curval           = this.metadata.current_value;
                var hot              = false;

                if(Array.isArray(curval) || typeof(curval) == "object"){
                    //if [] or {} using the current index value will have be non null if active
                    hot = Array.isArray(curval) ? parseInt(curval[i]) : parseInt(curval[i+1]);
                }else {
                    //if string, then we have to match against label value per iteration
                    if (label == parseInt(curval)) {
                        hot = true;
                    }
                }

                if(hot){
                    checked_selected = template_suffix == "select" ? "selected" : "checked";
                }

                enum_result.push({"index": i, "key" : label, "val" : value, "selected" : checked_selected});
            }
        }
        //push a new property for multi option inputs
        this.metadata["element_enum_array"] = enum_result;

        // possible to do nested template?
        // this.metadata.nested =  renderNested(m_nested, function(data){
        //    return {element_preceding_header : data.element_preceding_header, form_menu_description : data.form_menu_description }
        // });
        return Mustache.render(m_template, this.metadata);
    }else{
        console.log("The field type [",template_suffix,"] is not supported yet");
        return false;
    }
};

REDCapField.prototype.bindChange = function(element){
    var _this = this;

    // THE .change() EVENT IN MD LIBRARY HAS AN INFINITE TRIGGER BUG.
    // TODO If unable to use .change() , then need to check save dirty status

    this.jq_input.blur(function(e){
        _this.saved = false;
        _this.save();
        e.preventDefault();
    });
}

REDCapField.prototype.save = function(){
    // console.log("field.save() " + this.getName() );
    this.updateStatus("queued");
    this.parentForm.saveField(this);
}

REDCapField.prototype.getValue = function(){

    var field_type =  this.getType()
    if(field_type == "checkbox" || field_type == "radio") {
        var check_values = [];
        this.jq_input.each(function (){
            if($(this).prop("checked")){
                check_values.push({ "val" : $(this).val() , "checked" :  1});
            }else{
                //damn, ok only want to get all inputs if checkbox. not regular radio
                if(field_type == "checkbox"){
                    check_values.push({ "val" : $(this).val() , "checked" :  0});
                }
            }
        });
        var val = field_type == "checkbox" ? check_values : check_values[0]["val"];
    }else{
        var val = this.jq_input.val();
    }
    return val;
}

REDCapField.prototype.getName = function(){
    return this.metadata.field_name;
}

REDCapField.prototype.getType = function(){
    return this.metadata.element_type;
}

REDCapField.prototype.updateStatus = function(status){
    var filled = this.jq_input.closest(".bmd-form-group").hasClass("is-filled");
    this.jq_input.closest(".bmd-form-group").removeClass().addClass(this.og_parent_classes).addClass(status);
    if(filled){
        this.jq_input.closest(".bmd-form-group").addClass("is-filled");
    }
}

REDCapField.prototype.clearField = function(){
    if(this.jq_input){
        this.jq_input.closest(".bmd-form-group").removeClass().addClass(this.og_parent_classes);
    }
}


RCForm = {
    //not really a requirement to preset these vars
    config      : {},
    new_hash    : "",
    record_hash : "",
    hash_flag   : false,    //this is to keep 2 simultaneous ajax calls from createing multiple new record hashes

    record_id   : "",
    metadata    : {},
    fields      : {},
    queue       : $.Deferred().resolve(),

    init: function(config, container) {
        this.config         = config;
        this.new_hash       = config.new_hash;
        this.exclude_fields = config.exclude_fields;
        this.readonly       = config.readonly;
        this.metadata       = config["metadata"];

        // Build the field objects and append to container
        this.createForm(container);
    },

    // todo:  HANDLE ERRORS
    getMetadata: function(form_name) {
        $.ajax({
            context: RCForm,
            method: 'POST',
            data: {
                "action": "getMetadata",
                "hash"  : this.new_hash
            },
            dataType: 'json'
        }).done(function(data) {
            this.metadata = data;
        });
    },

    createForm : function(container){
        var newForm = $("<form>").addClass("container").addClass("mt-5").attr("id","redcap_form");
        container.append(newForm);
        this.buildFields();
        this.insertRows(newForm);

        this.jq     = newForm;
        this.addFormButtons();

        //start form disabled until image selected
        this.disableForm();
    },

    addFormButtons: function(){
        var _this = this;

        var reset_button = $("<button type='reset' class='btn btn-raised btn-danger'>Reset Form</button>");
        var save_button  = $("<button type='button' class='btn btn-raised btn-primary'>Save Form</button>");

        var btn_group   = $("<div class='btn-group'></div>");
        btn_group.append(reset_button);
        btn_group.append(save_button);

        reset_button.click(function(e){
            _this.refreshForm();
            e.preventDefault();
        });

        save_button.click(function(){
           console.log("do nothing but it allows for final input to 'change()'");
        });

        this.jq.append(btn_group);
    },

    buildFields: function(){
        // log("Building Fields From Metadata ... ")
        for (const field_name in this.metadata) {
            if (this.exclude_fields.indexOf(field_name) > -1){
               continue;
            }
            this.fields[field_name] = new REDCapField(this.metadata[field_name], this);
            this.fields[field_name]["metadata"]["hash"]     = this.new_hash;

            var readonly = this.readonly.indexOf(field_name) > -1 ? "readonly" : "";
            this.fields[field_name]["metadata"]["readonly"] = readonly;
        }
    },

    insertRows: function(container) {
        // log("Append field html into DOM");
        for (const field in this.fields) {
            this.fields[field].insertRow(container);
        }
    },

    saveField: function(field){
        var _this = this;
        // console.log("saveField started for " + field.metadata.field_name);

        //Checking if record_hash exists or is being fetched
        if(this.record_hash == "") {
            // get record_hash for the first time
            if (!this.hash_flag) {
                this.hash_flag  = true; // get only once per record;
                this.queue      = this.queue.then(this.getRecordHash.bind(this));
            }
            // console.log("quueing field" + field.metadata.field_name);
            // this.queue = this.queue.then(this.save.bind(field));
            this.queue = this.queue.then(this.saveField.bind(this,field));

        } else {
            console.log("alright, record_hash is there , field saving  " + field.getName());

            var input_field     = field.getName();
            var input_value     = field.getValue();
            var field_type      = field.getType();

            $.ajax({
                method: 'POST',
                data: {
                    "action"        : "saveField",
                    "hash"          : _this.record_hash,
                    "input_field"   : input_field,
                    "input_value"   : input_value,
                    "field_type"    : field_type,
                },
                dataType: 'json'
            }).done(function(result) {
                // console.log("saved " + field.metadata.field_name + " with result", result);
                field.updateStatus("done");
            }).fail(function(){
                console.log("save failed on field ", field);
            });
        }
    },

    getRecordHash: function(){
        var _this = this;

        //GET A record_hash representing the next available record that we can upload to.
        return $.ajax({
            method: 'POST',
            data: {
                "action": "getRecordHash",
                "hash"  : this.new_hash,
            },
            dataType: 'json'
        }).then(function(result) {
            _this.record_hash    = result.record_hash;
            _this.hash_flag      = false;

            // console.log('Record hash obtained: ' + _this.record_hash);

            _this.participant_id = result.record_id;
            RCTF.record_id.val(_this.participant_id);
            RCTF.record_id.closest(".bmd-form-group").addClass("is-filled");
        });
    },

    refreshForm: function(){
        // make form ready for new image

        // console.log("reset form + disable form");
        this.clearForm();
        this.disableForm();

        // console.log("Clear Feature Predictions");
        RCTF.clearFeaturePredictions();
        RCTF.clearPredictionStats();

        // console.log("Clear Image");
        RCTF.uploadImage.attr("src","").hide(0);
    },

    clearForm: function(){
        //reset form , js functionatlity
        this.jq.trigger("reset");

        //reset hash or else will try to save on existing record
        this.record_hash = false;

        //clear UI indicators
        for(var i in this.fields){
            this.fields[i].clearField();
        }
    },

    disableForm: function(){
        //set disabled until triggered
        this.jq.find(":input").prop("disabled", true);
    },

    enableForm: function(){
        //remove disabled
        this.jq.find(":input").prop("disabled", false);
    }

};