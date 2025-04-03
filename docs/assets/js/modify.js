$(document).ready(function() {
  // Helper function to extract query parameters from the URL
  function getParameterByName(name) {
    var url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    var results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  }
  
  // Extract dataset id from the URL parameter 'id'
  var datasetId = getParameterByName('id');
  
  // Points to your local form definition
  var formUrl = 'assets/forms.json';
  // Points to your remote schema
  var schemaUrl = 'https://raw.githubusercontent.com/blw-ofag-ufag/metadata/main/data/schemas/dataset.json';

  // Fetch the form definition
  $.getJSON(formUrl, function(formDefinition) {

    // Fetch the remote schema
    $.getJSON(schemaUrl, function(schemaData) {

      // Insert the schema into your form definition
      formDefinition.schema = schemaData;

      // Function to initialize the form
      function initForm() {
        // Ensure a submit button exists in the form
        if (!formDefinition.form.some(item => item.type === 'actions')) {
          formDefinition.form.push({
            type: 'actions',
            items: [
              {
                type: 'submit',
                value: 'Submit'
              }
            ]
          });
        }

        // Initialize the form using jsonForm plugin
        $('#my-form').jsonForm({
          schema: formDefinition.schema,
          form: formDefinition.form,
          value: formDefinition.value,
          onSubmit: function (errors, values) {
            if (errors) {
              alert('Please correct the errors in the form.');
            } else {
              $('#result').text(JSON.stringify(values, null, 2));
            }
          }
        });
      }
      
      // Check if a dataset ID was provided in the URL
      if (datasetId) {
        // Construct the URL for the existing data based on the dataset ID
        var dataUrl = 'https://raw.githubusercontent.com/blw-ofag-ufag/metadata/main/data/raw/datasets/' + datasetId + '.json';
        // Fetch the existing data
        $.getJSON(dataUrl, function(existingData) {
          // Insert the existing data into your form definition
          formDefinition.value = existingData;
          initForm();
        }).fail(function() {
          alert('Failed to load existing data.');
        });
      } else {
        // No ID provided, use an empty dataset
        formDefinition.value = {};
        initForm();
      }
    }).fail(function() {
      alert('Failed to load the remote schema.');
    });
  }).fail(function() {
    alert('Failed to load the form definition.');
  });
});
