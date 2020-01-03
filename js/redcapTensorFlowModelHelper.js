// This is a tensorflow helper object designed to manage all the tensorflow fun!
window.RCTF = {
    model_url: "/plugins/models/model.json",

    labels: ['Cardiomegaly', 'Emphysema', 'Effusion', 'Hernia', 'Infiltration', 'Mass', 'Nodule', 'Atelectasis',
        'Pneumothorax', 'Pleural Thickening', 'Pneumonia', 'Fibrosis', 'Edema', 'Consolidation'
    ],

    labels_to_show: ['Cardiomegaly', 'Emphysema', 'Effusion', 'Hernia', 'Infiltration', 'Mass', 'Nodule', 'Atelectasis',
        'Pneumothorax', 'Pleural Thickening', 'Pneumonia', 'Fibrosis', 'Edema', 'Consolidation'
    ],

    model: {},

    loadModel: async function() {
        var self = this;

        self.startProgress();

        function progress_model_load(p) {
            let percent = Math.round(p * 100);
            self.updateProgress(percent, "Loading Model (" + percent + "%)...");
        }

        this.model = await tf.loadLayersModel(this.model_url, { 'onProgress': progress_model_load });

        self.updateProgress(100, "Warming up...");

        // Warmup the model before using real data.
        const warmupResult = this.model.predict(tf.zeros([1, 320, 320, 3]), );
        warmupResult.dataSync();
        tf.dispose(warmupResult);

        self.prepareResults();

        self.stopProgress();
    },

    preprocessImage: function(image) {
        var self = this;

        return tf.tidy(() => {
            let tensor = tf.browser.fromPixels(image, numChannels = 3);
            const h = tensor.shape[0];
            const w = tensor.shape[1];
            console.log('dimensions are', h, w);
            console.log('tensor', tensor);

            tensor = tensor.slice([0, parseInt(w / 2 - h / 2), 0], [h, h, 3]);
            tensor = tensor.resizeBilinear([320, 320]).toFloat();

            let mean = tf.tensor1d([136.41330078125, 136.41330078125, 136.41330078125]);
            let std = tf.tensor1d([70.48567315394112]);
            let proc_image = tensor.sub(mean).div(std)
                .expandDims(0);
            return proc_image;
        })
    },

    num_predictions: 0,
    prediction_rolling_mean: 0,
    // tensor: 0,

    get_preds: async function(webcam_elemnt, model) {
        var self = this;

        tensor = self.preprocessImage(webcam_elemnt);

        var t0 = performance.now();
        let prediction = self.model.predict(tensor);
        let data = prediction.dataSync();
        var t1 = performance.now();

        var new_mean = (self.num_predictions * self.prediction_rolling_mean + t1 - t0) / (self.num_predictions + 1);
        self.num_predictions += 1;
        self.prediction_rolling_mean = new_mean;

        $(".prediction-time").text(`Average Prediction Time: ${Math.round(self.prediction_rolling_mean)} ms`)

        $("#memory").text(`GPU Memory: ${Math.round(tf.memory()["numBytesInGPU"]/1024/1024)} MB`);


        // Dump result data into REDcap field:
        $('input[name="data"]').val(JSON.stringify(data));

        // Update the results
        for (let i = 0; i < data.length; i++) {
            if (self.labels_to_show.indexOf(self.labels[i]) != -1) {
                bar = self.prediction_elements[i];
                bar.css("width", `${data[i] * 100}%`);
            }
        }

        tf.dispose(prediction);
        tf.dispose(data);
        tf.dispose(tensor);
    },

    readURL: function(input) {
        var self = this;

        if (input.files && input.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
                console.log("Second");
                // Upon loading file, place results into xray-image
                $('#xray-image').attr('src', e.target.result);

                // Store data in REDCap field
                $('input[name="image_base64"]').val(e.target.result);
            };

            console.log("First");
            reader.readAsDataURL(input.files[0]);
        }
    },

    // Array of jquery objects to hold progress bars for results
    prediction_elements: [],

    prepareResults: function() {
        var self = this;

        // Make a copy of the results template
        let pred_template = $(".prediction-template").clone();
        pred_template.removeAttr("hidden");
        pred_template.removeClass("prediction-template");

        let labels = self.labels;
        let labels_to_show = self.labels_to_show;

        for (let i = 0; i < labels.length; i++) {
            let e = pred_template.clone();
            let label = labels[i];
            e.find('.label').text(label);
            $("#prediction-list").append(e);

            self.prediction_elements.push($(e.find(".progress-bar")));
        }

        // Hide those results that are not set to show
        for (let i = 0; i < labels.length; i++) {
            if (labels_to_show.indexOf(labels[i]) == -1) {
                self.prediction_elements[i].parent().parent().parent().hide();
            }
        }

    },

    runModelOnImage: function(image) {
        var self = this;

        $('.prediction').show();

        // Set bars to zero
        for (let i = 0; i < self.labels_to_show.length; i++) {
            let bar = self.prediction_elements[i];
            bar.css("width", `0%`);
        }

        setTimeout(function() {
            self.get_preds(image, self.model);
        }, 100);
    },

    bindUpload: function() {
        var self = this;
        $('#select_file').change(function() {
            console.log("Analyzing...");
            setTimeout(function() {
                // Show the uploaded file
                $('#xray-image').show();

                // Rune model
                self.runModelOnImage($("#xray-image")[0]);
            }, 100)
        });

        // Capture click on image
        $('.select-xray').click(function() {
            $("#select_file").click();
        });
    },

    startProgress: function() {
        $('#pleaseWaitDialog').modal('show');
    },

    stopProgress: function() {
        $('#pleaseWaitDialog').modal('hide');
    },

    setProgressTitle: function(title) {
        $('#pleaseWaitDialog .modal-header').html("<h3>" + title + "</h3>");
    },

    updateProgress: function(percent, text) {
        $('#pleaseWaitDialog .progress-bar')
            .css("width", percent + '%')
            .attr("aria-valuenow", percent)
            .find('span').html(text);
    }
};

// RCTF.loadModel();
// RCTF.bindUpload();

