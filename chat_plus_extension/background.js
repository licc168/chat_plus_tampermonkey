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
                const dispositionHeader = disposition ? `content-disposition: ${disposition}` : '';

                if (!response.ok) { // Handles 4xx, 5xx errors
                    let errorPayload = {
                        status: response.status,
                        type: 'error',
                        error: `HTTP error! Status: ${response.status}`
                    };
                    // Read body once as text to avoid "body stream already read" error
                    const errorText = await response.text();
                    if (errorText) {
                        try {
                            // Try to parse it as JSON
                            const errorData = JSON.parse(errorText);
                            errorPayload.error = errorData.message || errorData.error || JSON.stringify(errorData);
                        } catch (e) {
                            // If it's not JSON, use the raw text as the error.
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
                        responseHeaders: dispositionHeader,
                        type: 'json'
                    });
                } else { // Handles blob responses (docx, pdf, mm, zip, etc.)
                    const blob = await response.blob();
                    const reader = new FileReader();
                    reader.onload = function() {
                        sendResponse({
                            status: response.status,
                            response: this.result, // ArrayBuffer
                            responseHeaders: dispositionHeader,
                            type: 'blob'
                        });
                    };
                    reader.readAsArrayBuffer(blob);
                }

            } catch (error) {
                console.error('Background fetch error:', error);
                let errorMessage = error.message;
                // Provide a more helpful message for the most common network error
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