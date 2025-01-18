$(document).ready(function() {
    // URL of the external JSON schema
    var schemaUrl = 'https://raw.githubusercontent.com/blw-ofag-ufag/data-catalog/refs/heads/main/docs/forms.json';
  
    // Fetch the external schema
    $.getJSON(schemaUrl, function(data) {
      // Add submit button to the form definition if not present
      if (!data.form.some(item => item.type === 'actions')) {
        data.form.push({
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
        schema: data.schema,
        form: data.form,
        onSubmit: function (errors, values) {
          if (errors) {
            alert('Please correct the errors in the form.');
          } else {
            // Display the generated JSON in the <pre> element
            $('#result').text(JSON.stringify(values, null, 2));
          }
        }
      });
    }).fail(function() {
      alert('Failed to load the schema. Please check the URL and try again.');
    });
  });
  