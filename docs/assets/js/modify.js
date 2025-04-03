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

  // Helper function to generate a UUID (version 4)
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Takes a JavaScript object and returns a new object
   * with "dct:identifier" at the top if it exists. 
   */
  function reorderIdentifierFirst(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    // Create a new object for safe reordering
    let newObj = {};

    // If there's a dct:identifier, set it first
    if (obj.hasOwnProperty('dct:identifier')) {
      newObj['dct:identifier'] = obj['dct:identifier'];
    }

    // Add the remaining properties
    for (let key in obj) {
      if (key !== 'dct:identifier') {
        newObj[key] = obj[key];
      }
    }
    return newObj;
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
              // 1. Ensure top-level dct:identifier
              if (!values['dct:identifier']) {
                values['dct:identifier'] = generateUUID();
              }

              // 2. Ensure distribution-level dct:identifier
              if (values['dcat:distribution'] && Array.isArray(values['dcat:distribution'])) {
                values['dcat:distribution'].forEach(function(distribution, i) {
                  if (!distribution['dct:identifier']) {
                    distribution['dct:identifier'] = generateUUID();
                  }
                  // Reorder each distribution so that dct:identifier is at top
                  values['dcat:distribution'][i] = reorderIdentifierFirst(distribution);
                });
              }

              // 3. Reorder top-level object so dct:identifier is first
              values = reorderIdentifierFirst(values);

              // 4. Display the resulting JSON
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
