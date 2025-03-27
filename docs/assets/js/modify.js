$(document).ready(function() {
  // 1. Points to your local form definition (which may contain "form": [...] etc.)
  var formUrl = 'assets/forms.json';

  // 2. Points to your remote schema
  var schemaUrl = 'https://raw.githubusercontent.com/blw-ofag-ufag/metadata/main/data/schemas/dataset.json';

  // 3. Points to your existing JSON (to edit)
  var dataUrl = 'https://raw.githubusercontent.com/blw-ofag-ufag/metadata/main/data/raw/datasets/83f93ff4-ef3f-43f1-af2c-83f18952283e.json';

  // Fetch the form definition
  $.getJSON(formUrl, function(formDefinition) {

    // Fetch the remote schema
    $.getJSON(schemaUrl, function(schemaData) {

      // Fetch the existing data
      $.getJSON(dataUrl, function(existingData) {

        // Insert the schema from GitHub into your form definition
        formDefinition.schema = schemaData;

        // Insert the existing data into your form definition
        formDefinition.value = existingData;

        // Optionally ensure a submit button is in the form:
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

        // Initialize the form
        $('#my-form').jsonForm({
          schema: formDefinition.schema,
          form: formDefinition.form,
          // "value" attribute – used to pre-fill the form
          value: formDefinition.value,
          onSubmit: function (errors, values) {
            if (errors) {
              alert('Please correct the errors in the form.');
            } else {
              $('#result').text(JSON.stringify(values, null, 2));
            }
          }
        });

      }).fail(function() {
        alert('Failed to load existing data.');
      });
    }).fail(function() {
      alert('Failed to load the remote schema.');
    });
  }).fail(function() {
    alert('Failed to load the form definition.');
  });
});