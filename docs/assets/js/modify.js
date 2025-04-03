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
      const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Reorders object so that 'dct:identifier' is first (if present)
  function reorderIdentifierFirst(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    let newObj = {};
    // Put 'dct:identifier' first, if it exists
    if (obj.hasOwnProperty('dct:identifier')) {
      newObj['dct:identifier'] = obj['dct:identifier'];
    }
    // Then copy over the rest
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
              // 1) Generate top-level identifier if missing
              if (!values['dct:identifier']) {
                values['dct:identifier'] = generateUUID();
              }
              // 2) For each distribution, ensure 'dct:identifier'
              if (values['dcat:distribution'] && Array.isArray(values['dcat:distribution'])) {
                values['dcat:distribution'].forEach((dist, i) => {
                  if (!dist['dct:identifier']) {
                    dist['dct:identifier'] = generateUUID();
                  }
                  values['dcat:distribution'][i] = reorderIdentifierFirst(dist);
                });
              }
              // 3) Reorder dataset object so 'dct:identifier' is first
              values = reorderIdentifierFirst(values);

              // (A) Store the final JSON & ID in sessionStorage
              sessionStorage.setItem('jsonData', JSON.stringify(values));
              sessionStorage.setItem('datasetId', values['dct:identifier']);

              // (B) Redirect to commit.html
              window.location.href = 'commit.html';
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
          formDefinition.value = existingData;
          initForm();
        }).fail(function() {
          alert('Failed to load existing data (404?). Starting with an empty form.');
          formDefinition.value = {};
          initForm();
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
