$(document).ready(function() {
    
    const API_BASE = 'https://api.github.com';
    const OWNER = 'blw-ofag-ufag';
    const REPO = 'metadata';
    const BRANCH = 'main'; // or "refs/heads/main"
  
    // Retrieve data from sessionStorage
    let jsonDataStr = sessionStorage.getItem('jsonData');
    let datasetId = sessionStorage.getItem('datasetId');
  
    if (!jsonDataStr || !datasetId) {
      $('#result').text(
        'No dataset JSON found in session. Please go back and submit a dataset first.'
      );
      $('#commit-btn').prop('disabled', true);
      return;
    }
  
    const jsonData = JSON.parse(jsonDataStr);
  
    function utf8ToB64(str) {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(str);
      let binary = '';
      bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
      });
      return window.btoa(binary);
    }
    const newContentBase64 = utf8ToB64(JSON.stringify(jsonData, null, 2));
  
    // Path: data/raw/datasets/<ID>.json
    const filePath = `data/raw/datasets/${datasetId}.json`;
  
    // Return to home button
    $('#home-btn').on('click', function() {
      window.location.href = 'index.html';
    });
  
    // Commit button
    $('#commit-btn').on('click', function() {
      const username = $('#gh-username').val().trim();
      const token = $('#gh-token').val().trim();
      const commitMsg = $('#commit-message').val().trim() || 'Update dataset';
  
      if (!username || !token) {
        $('#result').text('Please enter your GitHub username and token.');
        return;
      }
  
      // 1) Check if file already exists => GET for the file
      const getUrl = `${API_BASE}/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${BRANCH}`;
  
      $.ajax({
        url: getUrl,
        method: 'GET',
        headers: {
          'Authorization': 'token ' + token,
          'Accept': 'application/vnd.github.v3+json'
        },
        success: function(data) {
          // File exists => we have data.sha
          const existingSha = data.sha;
          commitFile(existingSha);
        },
        error: function(xhr) {
          if (xhr.status === 404) {
            // File does not exist => create new
            commitFile(null);
          } else {
            $('#result').text(
              `Error checking file existence: ${xhr.status}\n${xhr.responseText}`
            );
          }
        }
      });
  
      // 2) Create or update the file
      function commitFile(sha) {
        const putUrl = `${API_BASE}/repos/${OWNER}/${REPO}/contents/${filePath}`;
  
        const payload = {
          message: commitMsg,
          committer: {
            name: username,
            email: username + '@users.noreply.github.com'
          },
          content: newContentBase64,
          branch: BRANCH
        };
  
        if (sha) {
          payload.sha = sha;
        }
  
        $.ajax({
          url: putUrl,
          method: 'PUT',
          data: JSON.stringify(payload),
          headers: {
            'Authorization': 'token ' + token,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          success: function(response) {
            // success => Show link to the new/updated file
            const fileUrl = response.content.html_url;
            const anchor = `<a href="${fileUrl}" target="_blank">${fileUrl}</a>`;
            $('#result').html(
              'Commit successful!<br /><br />' +
              'View file on GitHub:<br />' + anchor
            );
          },
          error: function(xhr) {
            $('#result').text(
              `Error committing file: ${xhr.status}\n${xhr.responseText}`
            );
          }
        });
      }
    });
});