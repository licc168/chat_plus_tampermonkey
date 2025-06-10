// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getApiKey') {
        chrome.storage.local.get(['deepseek_generate_card_api_key'], function(result) {
            sendResponse({ apiKey: result.deepseek_generate_card_api_key || '' });
        });
        return true; // Indicates an asynchronous response
    } else if (request.action === 'setApiKey') {
        chrome.storage.local.set({ 'deepseek_generate_card_api_key': request.apiKey }, function() {
            sendResponse({ success: true });
        });
        return true;
    } else if (request.action === 'xmlHttpRequest') {
        (async () => {
            try {
                const response = await fetch(request.url, {
                    method: request.method,
                    headers: request.headers,
                    body: request.data
                });

                const contentType = response.headers.get("content-type");
                const disposition = response.headers.get("content-disposition");
                const filename = disposition && disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
                                 ? decodeURIComponent(disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)[1].replace(/['"]/g, ''))
                                 : 'download'; // Extract filename here

                if (!response.ok) { // Handles 4xx, 5xx errors
                    let errorPayload = {
                        status: response.status,
                        type: 'error',
                        error: `HTTP error! Status: ${response.status}`
                    };
                    const errorText = await response.text();
                    if (errorText) {
                        try {
                            const errorData = JSON.parse(errorText);
                            errorPayload.error = errorData.message || errorData.error || JSON.stringify(errorData);
                        } catch (e) {
                            errorPayload.error = errorText;
                        }
                    }
                    sendResponse(errorPayload);
                    return;
                }

                if (contentType && contentType.includes("application/json")) {
                    const jsonResponse = await response.json();
                    sendResponse({
                        status: response.status,
                        responseText: JSON.stringify(jsonResponse),
                        responseHeaders: disposition, // Use full disposition header
                        type: 'json'
                    });
                } else { // Handles blob responses (docx, pdf, mm, zip, etc.)
                    const blob = await response.blob();

                    // Use FileReader to convert Blob to Data URL, completely bypassing URL.createObjectURL
                    const reader = new FileReader();
                    reader.onloadend = function() {
                        const dataUrl = reader.result; // This is the Base64 Data URL

                        console.log('Background: Initiating chrome.downloads.download for:', filename);

                        // Use chrome.downloads.download API with Data URL
                        chrome.downloads.download({
                            url: dataUrl, // Use the Data URL here
                            filename: filename,
                            saveAs: false // <--- MODIFIED: Set to false to prevent "Save As" dialog
                        }, (downloadId) => {
                            if (chrome.runtime.lastError) {
                                console.error('Download failed:', chrome.runtime.lastError.message);
                                sendResponse({
                                    status: 0,
                                    type: 'error',
                                    error: `Download failed: ${chrome.runtime.lastError.message}`
                                });
                            } else {
                                console.log('Download initiated with ID:', downloadId);
                                sendResponse({
                                    status: response.status,
                                    type: 'downloadInitiated', // Indicate that download was initiated
                                    filename: filename
                                });
                            }
                            // No need to revokeObjectURL as we are not using Blob URLs
                        });
                    };
                    reader.onerror = function() {
                        console.error('FileReader error:', reader.error);
                        sendResponse({
                            status: 0,
                            type: 'error',
                            error: `FileReader error: ${reader.error.message}`
                        });
                    };
                    reader.readAsDataURL(blob); // Read the blob as a Data URL
                }

            } catch (error) {
                console.error('Background fetch error:', error);
                let errorMessage = error.message;
                if (error instanceof TypeError && error.message === 'Failed to fetch') {
                    errorMessage = 'Request failed. It might be a network issue or a CORS problem. Please check the browser console and network tab for more details. The server might not be allowing requests from this extension.';
                }
                sendResponse({
                    status: 0,
                    error: errorMessage,
                    type: 'error'
                });
            }
        })();
        return true; // Keep the message channel open for the async response
    }
});