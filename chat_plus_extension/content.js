// content.js

(function() {
    'use strict';

    const onDeepSeek = window.location.hostname.includes('deepseek.com');
    const onDoubao = window.location.hostname.includes('doubao.com');

    // --- Configuration ---
    const dislikeIconSvgPathStart = "M18.304";
    // Use Chrome's i18n for text
    const generateButtonText = chrome.i18n.getMessage("generateCardButtonText");
    const generateButtonTitle = chrome.i18n.getMessage("generateCardButtonTitle");
    const API_ENDPOINT = 'https://api.any2card.com/api/generate-image';
    const API_ENDPOINT_WORD = 'https://api.any2card.com/api/md-to-word';
    const API_ENDPOINT_PDF = 'https://api.any2card.com/api/md-to-pdf';
    const API_ENDPOINT_MINDMAP = 'https://api.any2card.com/api/md-to-mindmap';
    const API_ENDPOINT_SHARE_GOOGLE = 'https://api.any2card.com/api/user/shareGoogle';
    const API_KEY_STORAGE = 'deepseek_generate_card_api_key'; // Still used as the key for storage

    let modalOverlay = null;
    let apiKeyInput, markdownTextarea, templateSelect, splitModeSelect, widthInput, heightInput, aspectRatioSelect, fontSelect, watermarkToggle, watermarkTextInput, modalGenerateCardButton, modalCancelButton, cardResultDiv, heightOverflowHiddenToggle, heightOverflowHiddenRow;
    let floatingActionPanel = null;

    const SHARE_SETTINGS = {
        "backgroundColor": "#ffffff",
        "fontFamily": "var(--font-noto-serif-sc)",
        "textAlign": "left",
        "verticalPadding": 20,
        "horizontalPadding": 12,
        "isDarkMode": false,
        "borderRadius": 38,
        "cardColor": "#4a4a4a",
        "opacity": 60,
        "isContentCenter": false,
        "selectedRatio": "custom",
        "splitMode": "long",
        "templateType": "imageText",
        "selectedImageTextTemplate": "coilnotebook",
        "cardScale": 0.8,
        "watermarkText": "",
        "watermarkEnabled": false,
        "cardWidth": 440,
        "cardHeight": 587,
        "selectedCustomTheme": "custom-template",
        "selectedResumeTemplate": "neon",
        "selectedResumeTheme": "theme-sunrise",
        "lineHeight": 1.6
    };

    const floatingButtonStyles = {
        padding: '8px 12px',
        backgroundColor: 'rgb(0, 123, 255)',
        color: 'rgb(255, 255, 255)',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        transition: 'all 0.3s ease 0s',
        fontFamily: 'Arial, sans-serif',
        boxShadow: 'rgba(0, 0, 0, 0.2) 0px 2px 5px',
        whiteSpace: 'nowrap',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    };

    // --- Data from constants.ts ---
    const imageTextTemplates = [
      { id: "memo", name: "备忘录" },
      { id: "popart", name: "波普艺术" },
      { id: "traditionalchinese", name: "中国传统" },
      { id: "coilnotebook", name: "线圈笔记本" },
      { id: "purpleticket", name: "紫色小红书" },
      { id: "bytedance", name: "字节范" },
      { id: "warm", name: "温暖柔和" },
      { id: 'alibaba', name: '阿里橙' },
      { id: "notebook", name: "笔记本" },
      { id: "darktech", name: "黑色科技" },
      { id: "fairytale", name: "儿童童话" },
      { id: "boardgamestyle", name: "桌游风格" },
      { id: "cyberpunk", name: "赛博朋克" },
      { id: "glassmorphism", name: "玻璃拟态" },
      { id: "neonglow", name: "霓虹发光" },
      { id: "vintagenewspaper", name: "复古报纸" },
      { id: "handwrittennote", name: "手写笔记" },
      { id: "vintagemap", name: "古旧地图" },
    ];

    const splitModes = [
        { id: 'long', name: '长图文 (不分割)' },
        { id: 'auto', name: '自动切割 (智能)' },
        { id: 'line', name: '横线拆分 (---)' },
    ];

    const aspectRatios = [
        { id: 'custom', name: '自定义尺寸', width: 0, height: 0 },
        { id: '3:4', name: '3:4 竖屏', width: 3, height: 4 },
        { id: '1:1', name: '1:1 方形', width: 1, height: 1 },
        { id: '4:3', name: '4:3 横屏', width: 4, height: 3 },
        { id: '16:9', name: '16:9 横屏宽', width: 16, height: 9 },
        { id: '9:16', name: '9:16 竖屏长', width: 9, height: 16 },
    ];

    const fontOptionsFromConstants = [
      { label: "思源黑体", value: "var(--font-noto-sans-sc)" },
      { label: "思源宋体", value: "var(--font-noto-serif-sc)" },
      { label: "苹方中黑", value: "var(--font-pingfang-medium)" },
      { label: "方正公文黑", value: "var(--font-fangzheng-gongwenhei)" },
      { label: "汇文明朝", value: "var(--font-huiwen-mincho)" },
      { label: "霞鹜文楷", value: "var(--font-lxgw-wenkai-lite)" },
      { label: "马善政手写体", value: "var(--font-ma-shan-zheng)" },
      { label: "字酷快乐体", value: "var(--font-zcool-kuaile)" },
      { label: "字酷倾颜黄油体", value: "var(--font-zcool-qingke-huangyou)" },
      { label: "龙藏体", value: "var(--font-long-cang)" },
      { label: "智芒星体", value: "var(--font-zhi-mang-xing)" },
      { label: "柳简毛草体", value: "var(--font-liu-jian-mao-cao)" },
      { label: "字酷小薇体", value: "var(--font-zcool-xiaowei)" },
      { label: "禅丸哥特体", value: "var(--font-zen-maru-gothic)" },
      { label: "东叔原宋", value: "var(--font-dong-shu-yuan-song)" },
    ];

    const fontOptions = fontOptionsFromConstants.map(font => {
        let shortValue = font.value;
        if (font.value.startsWith("var(--font-") && font.value.endsWith(")")) {
            shortValue = font.value.substring(11, font.value.length - 1);
        }
        return { label: font.label, value: shortValue };
    });


    // Removed GM_addStyle - styles are now in styles.css

    function createSelect(options, id, defaultSelectedValue) {
        const select = document.createElement('select');
        select.id = id;
        options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt.id || opt.value;
            optionEl.textContent = opt.name || opt.label;
            if ((opt.id || opt.value) === defaultSelectedValue) {
                optionEl.selected = true;
            }
            select.appendChild(optionEl);
        });
        return select;
    }

    function htmlToMarkdown(element) {
        if (!element) return "";
        // Create a temporary clone to work on to avoid modifying the live DOM
        const clone = element.cloneNode(true);

        // --- 1. Pre-process and replace special elements ---

        // Handle KaTeX math formulas by extracting LaTeX from annotations
        clone.querySelectorAll('.katex, .katex-display').forEach(katexEl => {
            const annotation = katexEl.querySelector('annotation[encoding="application/x-tex"]');
            if (annotation && annotation.textContent) {
                const tex = annotation.textContent.trim();
                const isBlock = katexEl.classList.contains('katex-display');
                katexEl.replaceWith(document.createTextNode(isBlock ? `\n\n$$${tex}$$` + `\n\n` : `\\(${tex}\\)`));
            } else {
                // Fallback if no annotation is found, just use text content to avoid showing raw HTML
                katexEl.replaceWith(document.createTextNode(katexEl.textContent || ''));
            }
        });

        // Handle code blocks
        clone.querySelectorAll('pre code').forEach(codeBlock => {
            const parentPre = codeBlock.parentElement;
            const lang = [...codeBlock.classList].find(cls => cls.startsWith('language-'))?.replace('language-', '') || '';
            // Replace the <pre> element with a markdown code block as a single text node
            parentPre.replaceWith(document.createTextNode(`\n\n\`\`\`${lang}\n${codeBlock.textContent.trim()}\n\`\`\`\n\n`));
        });


        // --- 2. Convert remaining HTML to a text-based representation with Markdown-like newlines ---

        // This is a simplified process. We'll use innerHTML and a series of regex replacements.
        // It's not as robust as a full DOM traversal, but it's much simpler and handles the main cases.
        let markdown = clone.innerHTML;

        // Add newlines for block elements
        markdown = markdown.replace(/<br\s*\/?>/gi, '\n');
        markdown = markdown.replace(/<\/h[1-6]>/gi, '\n\n');
        markdown = markdown.replace(/<\/p>/gi, '\n\n');
        markdown = markdown.replace(/<\/li>/gi, '\n');
        markdown = markdown.replace(/<hr[^>]*>/gi, '\n\n---\n\n');

        // Add markdown prefixes for lists and headings
        markdown = markdown.replace(/<h1[^>]*>/gi, '# ');
        markdown = markdown.replace(/<h2[^>]*>/gi, '## ');
        markdown = markdown.replace(/<h3[^>]*>/gi, '### ');
        markdown = markdown.replace(/<h4[^>]*>/gi, '#### ');
        markdown = markdown.replace(/<li[^>]*>/gi, (match) => {
            // A rough way to detect list level by indentation in the source HTML
            const indentation = match.search(/\S|$/);
            const level = Math.floor(indentation / 2); // Assuming 2 spaces indentation
            return '  '.repeat(level) + '* ';
        });

        // Handle inline elements
        markdown = markdown.replace(/<strong>(.*?)<\/strong>/gis, '**$1**');
        markdown = markdown.replace(/<b>(.*?)<\/b>/gis, '**$1**');
        markdown = markdown.replace(/<em>(.*?)<\/em>/gis, '*$1*');
        markdown = markdown.replace(/<i>(.*?)<\/i>/gis, '*$1*');
        markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gis, '`$1`');
        markdown = markdown.replace(/<a href="(.*?)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

        // --- 3. Strip all remaining tags and clean up whitespace ---
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = markdown;
        markdown = tempDiv.textContent || tempDiv.innerText;

        // Normalize newlines, removing excessive blank lines
        return markdown.replace(/(\n\s*){3,}/g, '\n\n').trim();
    }

    function createCardModal() {
        if (document.getElementById('gmCardModalOverlay')) return;

        modalOverlay = document.createElement('div');
        modalOverlay.id = 'gmCardModalOverlay';
        modalOverlay.className = 'gm-card-modal-overlay';

        const modalContent = document.createElement('div');
        modalContent.className = 'gm-card-modal-content';
        modalContent.addEventListener('click', e => e.stopPropagation());

        const mainLayout = document.createElement('div');
        mainLayout.className = 'gm-card-modal-main-layout';

        const leftColumn = document.createElement('div');
        leftColumn.className = 'gm-card-modal-column gm-left-column';
        let label = document.createElement('label');
        label.htmlFor = 'gmCardMarkdown';
        label.textContent = chrome.i18n.getMessage("cardContentLabel");
        leftColumn.appendChild(label);
        markdownTextarea = document.createElement('textarea');
        markdownTextarea.id = 'gmCardMarkdown';
        markdownTextarea.readOnly = true;
        leftColumn.appendChild(markdownTextarea);
        mainLayout.appendChild(leftColumn);

        const middleColumn = document.createElement('div');
        middleColumn.className = 'gm-card-modal-column gm-middle-column';

        label = document.createElement('label');
        label.htmlFor = 'gmCardApiKey';
        label.textContent = 'API Key:'; // API Key label is usually universal
        middleColumn.appendChild(label);

        const apiKeyGroup = document.createElement('div');
        apiKeyGroup.className = 'gm-api-key-group';

        apiKeyInput = document.createElement('input');
        apiKeyInput.type = 'text';
        apiKeyInput.id = 'gmCardApiKey';
        apiKeyInput.placeholder = chrome.i18n.getMessage("apiKeyPlaceholder");

        const apiKeyLink = document.createElement('a');
        apiKeyLink.href = 'https://any2card.com/zh/blog/api-key'; // Link remains fixed
        apiKeyLink.target = '_blank';
        apiKeyLink.rel = 'noopener noreferrer';
        apiKeyLink.textContent = chrome.i18n.getMessage("getApiKeyLink");
        apiKeyLink.className = 'gm-api-key-link';

        apiKeyGroup.appendChild(apiKeyInput);
        apiKeyGroup.appendChild(apiKeyLink);
        middleColumn.appendChild(apiKeyGroup);

        label = document.createElement('label');
        label.htmlFor = 'gmCardTemplate';
        label.textContent = chrome.i18n.getMessage("imageTemplateLabel");
        middleColumn.appendChild(label);
        templateSelect = createSelect(imageTextTemplates, 'gmCardTemplate', imageTextTemplates[0]?.id);
        middleColumn.appendChild(templateSelect);

        label = document.createElement('label');
        label.htmlFor = 'gmCardSplitMode';
        label.textContent = chrome.i18n.getMessage("splitModeLabel");
        middleColumn.appendChild(label);
        splitModeSelect = createSelect(splitModes, 'gmCardSplitMode', splitModes[0]?.id);
        middleColumn.appendChild(splitModeSelect);

        // 新增：超出高度隐藏开关
        heightOverflowHiddenRow = document.createElement('div');
        heightOverflowHiddenRow.style.display = 'flex';
        heightOverflowHiddenRow.style.alignItems = 'center';
        heightOverflowHiddenRow.style.margin = '6px 0 0 0';
        let heightOverflowHiddenLabel = document.createElement('label');
        heightOverflowHiddenLabel.htmlFor = 'gmCardHeightOverflowHidden';
        heightOverflowHiddenLabel.textContent = chrome.i18n.getMessage("heightOverflowHiddenLabel");
        heightOverflowHiddenLabel.style.marginRight = '8px';
        heightOverflowHiddenToggle = document.createElement('input');
        heightOverflowHiddenToggle.type = 'checkbox';
        heightOverflowHiddenToggle.id = 'gmCardHeightOverflowHidden';
        // 顺序调整：label在前，checkbox在后
        heightOverflowHiddenRow.appendChild(heightOverflowHiddenLabel);
        heightOverflowHiddenRow.appendChild(heightOverflowHiddenToggle);
        middleColumn.appendChild(heightOverflowHiddenRow);

        // 监听分割模式变化，只有long时显示
        splitModeSelect.addEventListener('change', function() {
            if (splitModeSelect.value === 'long') {
                heightOverflowHiddenRow.style.display = '';
            } else {
                heightOverflowHiddenRow.style.display = 'none';
            }
        });
        // 初始化时根据默认分割模式显示/隐藏
        if (splitModeSelect.value === 'long') {
            heightOverflowHiddenRow.style.display = '';
        }

        const dimensionGrid = document.createElement('div');
        dimensionGrid.className = 'gm-card-modal-grid';
        let div = document.createElement('div');
        label = document.createElement('label');
        label.htmlFor = 'gmCardWidth';
        label.textContent = chrome.i18n.getMessage("widthLabel");
        div.appendChild(label);
        widthInput = document.createElement('input');
        widthInput.type = 'number';
        widthInput.id = 'gmCardWidth';
        div.appendChild(widthInput);
        dimensionGrid.appendChild(div);
        div = document.createElement('div');
        label = document.createElement('label');
        label.htmlFor = 'gmCardHeight';
        label.textContent = chrome.i18n.getMessage("heightLabel");
        div.appendChild(label);
        heightInput = document.createElement('input');
        heightInput.type = 'number';
        heightInput.id = 'gmCardHeight';
        div.appendChild(heightInput);
        dimensionGrid.appendChild(div);
        middleColumn.appendChild(dimensionGrid);

        label = document.createElement('label');
        label.htmlFor = 'gmCardAspectRatio';
        label.textContent = chrome.i18n.getMessage("aspectRatioLabel");
        middleColumn.appendChild(label);
        aspectRatioSelect = createSelect(aspectRatios, 'gmCardAspectRatio', aspectRatios.find(r => r.id === '3:4')?.id);
        aspectRatioSelect.addEventListener('change', function() {
            const selectedRatioInfo = aspectRatios.find(r => r.id === this.value);
            if (selectedRatioInfo && selectedRatioInfo.id !== 'custom' && selectedRatioInfo.width > 0 && selectedRatioInfo.height > 0) {
                const currentWidth = parseInt(widthInput.value, 10) || 440;
                widthInput.value = currentWidth;
                heightInput.value = Math.round((currentWidth * selectedRatioInfo.height) / selectedRatioInfo.width);
                heightInput.readOnly = true;
            } else {
                heightInput.readOnly = false;
            }
        });
        middleColumn.appendChild(aspectRatioSelect);

        label = document.createElement('label');
        label.htmlFor = 'gmCardFont';
        label.textContent = chrome.i18n.getMessage("fontSelectionLabel");
        middleColumn.appendChild(label);
        fontSelect = createSelect(fontOptions, 'gmCardFont', fontOptions.find(f => f.value === 'lxgw-wenkai-lite')?.value || fontOptions[0]?.value);
        middleColumn.appendChild(fontSelect);

        const watermarkGroup = document.createElement('div');
        watermarkGroup.className = 'gm-card-modal-watermark-group';
        watermarkToggle = document.createElement('input');
        watermarkToggle.type = 'checkbox';
        watermarkToggle.id = 'gmCardWatermarkToggle';
        watermarkGroup.appendChild(watermarkToggle);
        let watermarkLabelElement = document.createElement('label');
        watermarkLabelElement.htmlFor = 'gmCardWatermarkToggle';
        watermarkLabelElement.textContent = chrome.i18n.getMessage("enableWatermarkLabel");
        watermarkGroup.appendChild(watermarkLabelElement);
        watermarkTextInput = document.createElement('input');
        watermarkTextInput.type = 'text';
        watermarkTextInput.id = 'gmCardWatermarkText';
        watermarkTextInput.placeholder = chrome.i18n.getMessage("watermarkTextPlaceholder");
        watermarkTextInput.style.flexGrow = '1';
        watermarkTextInput.disabled = true;
        watermarkToggle.addEventListener('change', () => watermarkTextInput.disabled = !watermarkToggle.checked);
        watermarkGroup.appendChild(watermarkTextInput);
        middleColumn.appendChild(watermarkGroup);
        mainLayout.appendChild(middleColumn);

        const rightColumn = document.createElement('div');
        rightColumn.className = 'gm-card-modal-column gm-right-column';
        label = document.createElement('label');
        label.htmlFor = 'gmCardResultDiv';
        label.textContent = chrome.i18n.getMessage("generationResultLabel");
        rightColumn.appendChild(label);
        cardResultDiv = document.createElement('div');
        cardResultDiv.id = 'gmCardResultDiv';
        rightColumn.appendChild(cardResultDiv);
        mainLayout.appendChild(rightColumn);

        modalContent.appendChild(mainLayout);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'gm-card-modal-buttons';
        modalCancelButton = document.createElement('button');
        modalCancelButton.textContent = chrome.i18n.getMessage("cancelButton");
        modalCancelButton.id = 'gmCardCancelBtn';
        modalCancelButton.addEventListener('click', () => modalOverlay.classList.remove('gm-modal-visible'));
        modalGenerateCardButton = document.createElement('button');
        modalGenerateCardButton.textContent = chrome.i18n.getMessage("generateCardButtonText");
        modalGenerateCardButton.id = 'gmCardGenerateBtn';
        buttonsDiv.appendChild(modalCancelButton);
        buttonsDiv.appendChild(modalGenerateCardButton);
        modalContent.appendChild(buttonsDiv);

        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
        modalOverlay.addEventListener('click', () => modalOverlay.classList.remove('gm-modal-visible'));
    }

    async function handleGenerateCard() {
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            alert(chrome.i18n.getMessage("apiKeyRequiredAlert"));
            apiKeyInput.focus();
            return;
        }
        await chrome.runtime.sendMessage({ action: 'setApiKey', apiKey: apiKey });

        const settings = {
            templateType: "imageText",
            selectedImageTextTemplate: templateSelect.value,
            splitMode: splitModeSelect.value,
            cardWidth: parseInt(widthInput.value, 10) || 440,
            cardHeight: parseInt(heightInput.value, 10) || 587,
            fontFamily: fontSelect.value,
            watermarkEnabled: watermarkToggle.checked,
            watermarkText: watermarkToggle.checked ? watermarkTextInput.value.trim() : "",
            deviceScaleFactor: 2,
            heightOverflowHidden: splitModeSelect.value === 'long' ? heightOverflowHiddenToggle.checked : false,
        };
        const markdownContent = markdownTextarea.value;

        if (!markdownContent) { alert(chrome.i18n.getMessage("noCardContentAlert")); return; }
        if (settings.cardWidth <= 0 || settings.cardHeight <= 0) { alert(chrome.i18n.getMessage("invalidDimensionsAlert")); return; }

        console.log("API Request Parameters:");
        console.log("Settings:", JSON.parse(JSON.stringify(settings)));
        console.log("Markdown Content:", markdownContent);

        modalGenerateCardButton.disabled = true;
        modalGenerateCardButton.innerHTML = `<span class="gm-spinner"></span>${chrome.i18n.getMessage("generatingText")}...`;
        cardResultDiv.innerHTML = chrome.i18n.getMessage("requestingApiText");

        const response = await chrome.runtime.sendMessage({
            action: 'xmlHttpRequest',
            method: "POST",
            url: API_ENDPOINT,
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey
            },
            data: JSON.stringify({ markdownContent, settings })
        });

        try {
            if (response.type === 'error') {
                throw new Error(response.error);
            }

            // Handle both JSON and downloadInitiated types for card generation response
            if (response.status >= 200 && response.status < 300 && response.type === 'json') {
                const result = JSON.parse(response.responseText);
                if (result.code === 0) {
                    cardResultDiv.innerHTML = '';
                    if (result.data && result.data.url) {
                        if (result.data.type === 'png') {
                            const img = document.createElement('img');
                            img.src = result.data.url;
                            img.alt = chrome.i18n.getMessage("generatedCardAlt");
                            cardResultDiv.appendChild(img);

                            const previewButton = document.createElement('button');
                            previewButton.textContent = chrome.i18n.getMessage("previewOriginalImageButton");
                            previewButton.className = 'gm-preview-image-button';
                            previewButton.onclick = function() {
                                window.open(result.data.url, '_blank');
                            };
                            cardResultDiv.insertBefore(previewButton, img);

                        } else if (result.data.type === 'zip') {
                            const link = document.createElement('a');
                            link.href = result.data.url;
                            link.textContent = chrome.i18n.getMessage("downloadCardZipText", [result.data.pages ? ' - ' + result.data.pages + chrome.i18n.getMessage("pagesUnit") : '']);
                            link.target = '_blank';
                            cardResultDiv.appendChild(link);
                            if(confirm(chrome.i18n.getMessage("zipGeneratedConfirm"))) {
                                window.open(result.data.url, '_blank');
                            }
                        } else {
                            cardResultDiv.textContent = `${chrome.i18n.getMessage("unknownResponseType")}: ${result.data.type}`;
                        }
                    } else {
                        cardResultDiv.textContent = chrome.i18n.getMessage("noValidUrlInApiResponse");
                    }
                } else {
                    throw new Error(result.message || `${chrome.i18n.getMessage("apiFailed")} (API Code: ${result.code})`);
                }
            } else if (response.status >= 200 && response.status < 300 && response.type === 'downloadInitiated') {
                // For direct file downloads initiated by background script (like generating cards as ZIP)
                cardResultDiv.innerHTML = `<p>${chrome.i18n.getMessage("exportingText")} ${response.filename || 'file'}...</p>`;
                cardResultDiv.innerHTML += `<p>Please check your browser's download bar.</p>`;
                // No alert for this case
            } else if (response.type !== 'error') {
                 throw new Error(`${chrome.i18n.getMessage("unexpectedApiResponse")} Status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error processing response:', error);
            cardResultDiv.textContent = `${chrome.i18n.getMessage("errorText")}: ${error.message}`;
        } finally {
            modalGenerateCardButton.disabled = false;
            modalGenerateCardButton.textContent = chrome.i18n.getMessage("generateCardButtonText");
        }
    }

    async function showCardModal(defaultMarkdown) {
        if (!modalOverlay) createCardModal();

        markdownTextarea.value = defaultMarkdown;
        const result = await chrome.runtime.sendMessage({ action: 'getApiKey' });
        apiKeyInput.value = result.apiKey || "";

        widthInput.value = '440';
        heightInput.value = '587';
        aspectRatioSelect.value = aspectRatios.find(r => r.id === '3:4')?.id || aspectRatios[0].id;
        aspectRatioSelect.dispatchEvent(new Event('change'));

        heightOverflowHiddenToggle.checked = false;
        if (splitModeSelect.value === 'long') {
            heightOverflowHiddenRow.style.display = '';
        } else {
            heightOverflowHiddenRow.style.display = 'none';
        }

        watermarkToggle.checked = false;
        watermarkTextInput.value = '';
        watermarkTextInput.disabled = true;
        cardResultDiv.innerHTML = '';

        const oldBtn = modalGenerateCardButton;
        if (oldBtn && oldBtn.parentNode) {
            modalGenerateCardButton = oldBtn.cloneNode(true);
            oldBtn.parentNode.replaceChild(modalGenerateCardButton, oldBtn);
        }
        modalGenerateCardButton.addEventListener('click', handleGenerateCard);


        modalOverlay.classList.add('gm-modal-visible');
        if (!apiKeyInput.value) apiKeyInput.focus();
    }

    function addGenerateCardButton(targetButtonElement) {
        if (targetButtonElement.dataset.hasGenerateCardButton) return;

        const genButton = document.createElement('button');
        genButton.textContent = generateButtonText;
        genButton.title = generateButtonTitle;
        genButton.className = 'gm-generate-card-button';

        genButton.addEventListener('click', async function(event) {
            event.stopPropagation();
            event.preventDefault();
            let promptText = '';

            // --- Start: New clipboard logic ---
            let copyButton;
            if (onDeepSeek) {
                const actionsContainer = targetButtonElement.parentElement;
                if (actionsContainer) {
                    const buttonsInContainer = actionsContainer.querySelectorAll('div.ds-icon-button');
                    for (let i = 0; i < buttonsInContainer.length; i++) {
                        const svgPath = buttonsInContainer[i].querySelector('svg path[d^="M3.65169"]');
                        if (svgPath) {
                            copyButton = buttonsInContainer[i];
                            break;
                        }
                    }
                }
            } else if (onDoubao) {
                const actionsContainer = targetButtonElement.closest('.container-tjEzGV');
                if (actionsContainer) {
                    copyButton = actionsContainer.querySelector('button[data-testid="message_action_copy"]');
                }
            }

            if (copyButton) {
                try {
                    copyButton.click(); // Simulate click on the copy button
                    await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay
                    promptText = await navigator.clipboard.readText();

                    if (promptText && promptText.trim() !== '') {
                        console.log('Script: Successfully retrieved content from clipboard.');
                        showCardModal(promptText);
                        return; // Successfully got content from clipboard
                    } else {
                        console.log('Script: Clipboard was empty after copy. Falling back to text extraction.');
                        promptText = ''; // Ensure promptText is reset
                    }
                } catch (err) {
                    console.log('Script: Failed to read from clipboard. Error: ' + err.message + '. Falling back.');
                    promptText = ''; // Ensure promptText is reset
                }
            } else {
                console.log('Script: Could not find the copy button. Falling back to text extraction.');
            }
            // --- End: New clipboard logic ---

            // --- Fallback: Existing text extraction logic ---
            if (!promptText) {
                if (onDeepSeek) {
                    let messageWrapper = null;
                    let currentElement = targetButtonElement;
                    const messageWrapperSelectors = [
                        '.group', '.chat-message-item', '.message-container',
                        'div[class*="message-bubble"]', 'div[class*="content-container"]',
                    ];

                    for (let i = 0; i < 7 && currentElement && currentElement.parentElement; i++) {
                        currentElement = currentElement.parentElement;
                        for (const selector of messageWrapperSelectors) {
                            if (currentElement.matches(selector)) {
                                messageWrapper = currentElement;
                                break;
                            }
                        }
                        if (!messageWrapper &&
                            currentElement.querySelector('div.ds-markdown.ds-markdown--block:not(:empty)') &&
                            currentElement.contains(targetButtonElement)) {
                            messageWrapper = currentElement;
                        }
                        if (messageWrapper) break;
                    }

                    if (messageWrapper) {
                        const markdownElements = Array.from(messageWrapper.querySelectorAll('div.ds-markdown.ds-markdown--block:not(:empty)'));
                        let foundMd = null;
                        for (let i = markdownElements.length - 1; i >= 0; i--) {
                            if (!markdownElements[i].contains(targetButtonElement)) {
                                foundMd = markdownElements[i];
                                break;
                            }
                        }
                        if (foundMd) {
                            promptText = (foundMd.innerText || foundMd.textContent || "").trim();
                        }
                    }

                    if (!promptText) {
                        let searchStartNode = targetButtonElement.parentElement;
                        for (let i = 0; i < 3 && searchStartNode; i++) {
                            let sibling = searchStartNode.previousElementSibling;
                            while (sibling) {
                                if (sibling.matches('div.ds-markdown.ds-markdown--block:not(:empty)')) {
                                    promptText = (sibling.innerText || sibling.textContent || "").trim();
                                    break;
                                }
                                const mdBlock = sibling.querySelector('div.ds-markdown.ds-markdown--block:not(:empty)');
                                if (mdBlock) {
                                    promptText = (mdBlock.innerText || mdBlock.textContent || "").trim();
                                    break;
                                }
                                sibling = sibling.previousElementSibling;
                            }
                            if (promptText) break;
                            searchStartNode = searchStartNode.parentElement;
                        }
                    }
                    console.log('Script: Using fallback text extraction for DeepSeek. Found: ' + (promptText ? 'content' : 'no content'));
                } else if (onDoubao) {
                    const messageWrapper = targetButtonElement.closest('div[data-testid="receive_message"]');
                    if (messageWrapper) {
                        const contentEl = messageWrapper.querySelector('div[data-testid="message_text_content"]');
                        if (contentEl) {
                            promptText = htmlToMarkdown(contentEl);
                        }
                    }
                }
            }
            // --- End of Fallback logic ---

            if (!promptText) {
                console.log('Script: Could not reliably find message content using any method.');
                promptText = chrome.i18n.getMessage("contentExtractionFailed");
            }
            showCardModal(promptText);
        });

        if (targetButtonElement.nextSibling) {
            targetButtonElement.parentNode.insertBefore(genButton, targetButtonElement.nextSibling);
        } else {
            targetButtonElement.parentNode.appendChild(genButton);
        }
        targetButtonElement.dataset.hasGenerateCardButton = 'true';
    }

    function findAndProcessTargetButtons_DeepSeek() {
        const specificDislikeButtonSelector = `div.ds-icon-button svg path[d^="${dislikeIconSvgPathStart}"]`;
        const iconPaths = document.querySelectorAll(specificDislikeButtonSelector);
        iconPaths.forEach(svgPath => {
            const buttonElement = svgPath.closest('div.ds-icon-button');
            if (buttonElement) {
                const messageRoleCheck = buttonElement.closest('[class*="agent"], [class*="assistant"], [class*="response"]');
                const userRoleCheck = buttonElement.closest('[class*="user"], [class*="prompt"]');
                if (userRoleCheck && messageRoleCheck && userRoleCheck.contains(messageRoleCheck)) { /* Skip nested */ }
                else if (userRoleCheck) { return; }
                addGenerateCardButton(buttonElement);
            }
        });
    }

    function findAndProcessTargetButtons_Doubao() {
        const dislikeButtons = document.querySelectorAll('button[data-testid="message_action_dislike"]');
        dislikeButtons.forEach(button => {
            const messageContainer = button.closest('div[data-testid="receive_message"]');
            if (messageContainer) {
                addGenerateCardButton(button);
            }
        });
    }

    function findAndProcessTargetButtons() {
        if (onDeepSeek) {
            findAndProcessTargetButtons_DeepSeek();
        } else if (onDoubao) {
            findAndProcessTargetButtons_Doubao();
        }
    }

    // --- Helper functions for content extraction ---
    function getCopyButtonFromMessageWrapper(wrapper) {
        if (onDeepSeek) {
            const svgPath = wrapper.querySelector('div.ds-icon-button svg path[d^="M3.65169"]');
            return svgPath ? svgPath.closest('div.ds-icon-button') : null;
        }
        if (onDoubao) {
            return wrapper.querySelector('button[data-testid="message_action_copy"]');
        }
        return null;
    }

    function getMarkdownFromMessageWrapper(wrapper) {
        let contentElement;
        if (onDeepSeek) {
            contentElement = wrapper.querySelector('div.ds-markdown.ds-markdown--block:not(:empty)');
            if (contentElement) return htmlToMarkdown(contentElement);

            // Fallback for DeepSeek's complex structure
            const children = Array.from(wrapper.children || []);
            for (const child of children) {
                if (!child.querySelector('.ds-flex') && !child.classList.contains('gm-message-checkbox-container')) {
                    const text = child.innerText || child.textContent || "";
                    if (text.trim()) return text.trim();
                }
            }
        } else if (onDoubao) {
            contentElement = wrapper.querySelector('div[data-testid="message_text_content"]');
            if (contentElement) return htmlToMarkdown(contentElement);
        }
        return '';
    }

    async function getCombinedMarkdownForExport() {
        const checkedBoxes = document.querySelectorAll('.gm-message-checkbox:checked');
        if (checkedBoxes.length === 0) {
            alert(chrome.i18n.getMessage("selectConversationsAlert"));
            return null;
        }

        let combinedMarkdown = [];
        let firstTitle = onDeepSeek ? 'DeepSeek' : 'Doubao';
        let foundFirstTitle = false;

        for (const checkbox of checkedBoxes) {
            const messageWrapper = checkbox.closest('.gm-message-item-for-checkbox');
            if (!messageWrapper) continue;

            let promptText = '';
            const copyButton = getCopyButtonFromMessageWrapper(messageWrapper);

            if (copyButton) {
                try {
                    copyButton.click();
                    await new Promise(resolve => setTimeout(resolve, 150));
                    promptText = await navigator.clipboard.readText();
                    console.log(`Script: Successfully retrieved content from clipboard for ${window.location.hostname}.`);
                } catch (err) {
                    console.log(`Script: Clipboard copy failed on ${window.location.hostname}: ${err.message}. Falling back to htmlToMarkdown.`);
                    promptText = getMarkdownFromMessageWrapper(messageWrapper);
                }
            } else {
                console.log(`Script: Copy button not found on ${window.location.hostname}, falling back to direct text extraction.`);
                promptText = getMarkdownFromMessageWrapper(messageWrapper);
            }

            if (promptText) {
                if (!foundFirstTitle) {
                    const titleMatch = promptText.match(/^(?:#\s+)(.+)/);
                    if (titleMatch && titleMatch[1]) {
                        firstTitle = titleMatch[1].trim();
                        foundFirstTitle = true;
                    }
                }
                combinedMarkdown.push(promptText);
            }
        }

        if (combinedMarkdown.length === 0) {
            alert(chrome.i18n.getMessage("failedToExtractContent"));
            return null;
        }

        return {
            markdown: combinedMarkdown.join('\n\n'),
            title: firstTitle,
        };
    }

    // --- New Feature Functions ---
    function createFloatingActionPanel() {
        if (document.getElementById('gm-floating-action-panel')) return;

        floatingActionPanel = document.createElement('div');
        floatingActionPanel.id = 'gm-floating-action-panel';

        Object.assign(floatingActionPanel.style, {
            position: 'fixed',
            // Changed 'top: 45%' to 'top: 20px' for a top-right position with some margin
            top: '50px', // Adjusted to move it higher
            right: '10px',
            zIndex: '9999',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            opacity: '0.7',
            transition: 'opacity 0.3s ease',
            cursor: 'move'
        });

        floatingActionPanel.onmouseenter = () => { floatingActionPanel.style.opacity = '1'; };
        floatingActionPanel.onmouseleave = () => { floatingActionPanel.style.opacity = '0.7'; };

        let isDragging = false;
        let initialX, initialY;
        let xOffset = 0, yOffset = 0;

        function dragStart(e) {
            if (e.target === floatingActionPanel) {
                isDragging = true;
                initialX = e.clientX - xOffset;
                initialY = e.clientY - yOffset;
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                const currentX = e.clientX - initialX;
                const currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                floatingActionPanel.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
            }
        }

        function dragEnd() {
            isDragging = false;
        }

        floatingActionPanel.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        document.body.appendChild(floatingActionPanel);
    }

    function addExportWordButton() {
        if (document.getElementById('gmMainExportWordBtn') || !floatingActionPanel) return;

        const exportWordButton = document.createElement('button');
        exportWordButton.id = 'gmMainExportWordBtn';
        Object.assign(exportWordButton.style, floatingButtonStyles);


        const iconHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M7 11l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M12 4v12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
        const buttonText = chrome.i18n.getMessage("exportWordButton");
        exportWordButton.innerHTML = iconHTML + `<span>${buttonText}</span>`;

        const setLoading = (isLoading) => {
            if (isLoading) {
                exportWordButton.disabled = true;
                exportWordButton.innerHTML = `<span class="gm-spinner"></span><span>${chrome.i18n.getMessage("exportingText")}...</span>`;
            } else {
                exportWordButton.disabled = false;
                exportWordButton.innerHTML = iconHTML + `<span>${buttonText}</span>`;
            }
        };

        exportWordButton.addEventListener('click', async () => {
            setLoading(true);
            const exportData = await getCombinedMarkdownForExport();
            if (!exportData) {
                setLoading(false);
                return;
            }

            const payload = { markdown: exportData.markdown, title: exportData.title };
            console.log('Export to Word params:', payload);

            const response = await chrome.runtime.sendMessage({
                action: 'xmlHttpRequest',
                method: "POST",
                url: API_ENDPOINT_WORD,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(payload)
            });

            console.log('Raw Export to Word response:', response);

            setLoading(false);
            if (response.type === 'error') {
                alert(`${chrome.i18n.getMessage("exportFailed")}: ${response.error}`);
            } else if (response.status >= 200 && response.status < 300 && response.type === 'downloadInitiated') {
                // Removed the alert for successful download here
            } else if (response.status >= 200 && response.status < 300 && response.type === 'json') {
                try {
                    const result = JSON.parse(response.responseText);
                    alert(`${chrome.i18n.getMessage("exportFailed")}: ${result.message || 'Unexpected JSON response.'}`);
                } catch (e) {
                     alert(`${chrome.i18n.getMessage("exportFailed")}: Unexpected response from server.`);
                }
            } else {
                alert(`${chrome.i18n.getMessage("exportFailed")}: Unexpected response from server.`);
            }
        });

        floatingActionPanel.appendChild(exportWordButton);
    }

    function addExportPdfButton() {
        if (document.getElementById('gmMainExportPdfBtn') || !floatingActionPanel) return;

        const exportPdfButton = document.createElement('button');
        exportPdfButton.id = 'gmMainExportPdfBtn';
        Object.assign(exportPdfButton.style, floatingButtonStyles);


        const iconHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 2v7h7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const buttonText = chrome.i18n.getMessage("exportPdfButton");
        exportPdfButton.innerHTML = iconHTML + `<span>${buttonText}</span>`;

        const setLoading = (isLoading) => {
            if (isLoading) {
                exportPdfButton.disabled = true;
                exportPdfButton.innerHTML = `<span class="gm-spinner"></span><span>${chrome.i18n.getMessage("exportingText")}...</span>`;
            } else {
                exportPdfButton.disabled = false;
                exportPdfButton.innerHTML = iconHTML + `<span>${buttonText}</span>`;
            }
        };

        exportPdfButton.addEventListener('click', async () => {
            setLoading(true);
            const exportData = await getCombinedMarkdownForExport();
            if (!exportData) {
                setLoading(false);
                return;
            }

            const payload = { markdown: exportData.markdown, title: exportData.title };
            console.log('Export to PDF params:', payload);

            const response = await chrome.runtime.sendMessage({
                action: 'xmlHttpRequest',
                method: "POST",
                url: API_ENDPOINT_PDF,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(payload)
            });

            console.log('Raw Export to PDF response:', response);

            setLoading(false);
            if (response.type === 'error') {
                alert(`${chrome.i18n.getMessage("exportFailed")}: ${response.error}`);
            } else if (response.status >= 200 && response.status < 300 && response.type === 'downloadInitiated') {
                // Removed the alert for successful download here
            } else if (response.status >= 200 && response.status < 300 && response.type === 'json') {
                try {
                    const result = JSON.parse(response.responseText);
                    alert(`${chrome.i18n.getMessage("exportFailed")}: ${result.message || 'Unexpected JSON response.'}`);
                } catch (e) {
                     alert(`${chrome.i18n.getMessage("exportFailed")}: Unexpected response from server.`);
                }
            } else {
                alert(`${chrome.i18n.getMessage("exportFailed")}: Unexpected response from server.`);
            }
        });

        floatingActionPanel.appendChild(exportPdfButton);
    }

    function addExportMindMapButton() {
        if (document.getElementById('gmMainExportMindMapBtn') || !floatingActionPanel) return;

        const exportMindMapButton = document.createElement('button');
        exportMindMapButton.id = 'gmMainExportMindMapBtn';
        Object.assign(exportMindMapButton.style, floatingButtonStyles);


        const iconHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 12H3M7 12C7 8.68629 9.68629 6 13 6V6C16.3137 6 19 8.68629 19 12V12C19 15.3137 16.3137 18 13 18V18C9.68629 18 7 15.3137 7 12V12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 6V3M13 18V21M19 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const buttonText = chrome.i18n.getMessage("exportMindMapButton");
        exportMindMapButton.innerHTML = iconHTML + `<span>${buttonText}</span>`;

        const setLoading = (isLoading) => {
            if (isLoading) {
                exportMindMapButton.disabled = true;
                exportMindMapButton.innerHTML = `<span class="gm-spinner"></span><span>${chrome.i18n.getMessage("exportingText")}...</span>`;
            } else {
                exportMindMapButton.disabled = false;
                exportMindMapButton.innerHTML = iconHTML + `<span>${buttonText}</span>`;
            }
        };

        exportMindMapButton.addEventListener('click', async () => {
            setLoading(true);
            const exportData = await getCombinedMarkdownForExport();
            if (!exportData) {
                setLoading(false);
                return;
            }

            const payload = { markdown: exportData.markdown, title: exportData.title };
            console.log('Export to MindMap params:', payload);

            const response = await chrome.runtime.sendMessage({
                action: 'xmlHttpRequest',
                method: "POST",
                url: API_ENDPOINT_MINDMAP,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(payload)
            });

            console.log('Raw Export to MindMap response:', response);

            setLoading(false);
            if (response.type === 'error') {
                alert(`${chrome.i18n.getMessage("exportFailed")}: ${response.error}`);
            } else if (response.status >= 200 && response.status < 300 && response.type === 'downloadInitiated') {
                // Removed the alert for successful download here
            } else if (response.status >= 200 && response.status < 300 && response.type === 'json') {
                try {
                    const result = JSON.parse(response.responseText);
                    alert(`${chrome.i18n.getMessage("exportFailed")}: ${result.message || 'Unexpected JSON response.'}`);
                } catch (e) {
                     alert(`${chrome.i18n.getMessage("exportFailed")}: Unexpected response from server.`);
                }
            } else {
                alert(`${chrome.i18n.getMessage("exportFailed")}: Unexpected response from server.`);
            }
        });

        floatingActionPanel.appendChild(exportMindMapButton);
    }

    function addExportMarkdownButton() {
        if (document.getElementById('gmMainExportMarkdownBtn') || !floatingActionPanel) return;

        const exportMarkdownButton = document.createElement('button');
        exportMarkdownButton.id = 'gmMainExportMarkdownBtn';
        Object.assign(exportMarkdownButton.style, floatingButtonStyles);

        const iconHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 7V17M15 7V17M9 12H15M3 10V4C3 3.44772 3.44772 3 4 3H16L21 8V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const buttonText = chrome.i18n.getMessage("exportMarkdownButton");
        exportMarkdownButton.innerHTML = iconHTML + `<span>${buttonText}</span>`;

        const originalInnerHTML = exportMarkdownButton.innerHTML;
        const setLoading = (isLoading) => {
            if (isLoading) {
                exportMarkdownButton.disabled = true;
                exportMarkdownButton.innerHTML = `<span class="gm-spinner"></span><span>${chrome.i18n.getMessage("exportingText")}...</span>`;
            } else {
                exportMarkdownButton.disabled = false;
                exportMarkdownButton.innerHTML = originalInnerHTML;
            }
        };

        exportMarkdownButton.addEventListener('click', async () => {
            setLoading(true);
            const exportData = await getCombinedMarkdownForExport();
            if (!exportData) {
                setLoading(false);
                return;
            }

            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
                let chatName = document.title.split(' - ')[0] || exportData.title;
                chatName = `${onDeepSeek ? 'DeepSeek' : chrome.i18n.getMessage("doubaoAppName")} - ${chatName}`.replace(/[\/\\?%*:|"<>]/g, '-');
                const fileName = `${chatName}_${timestamp}.md`;

                const blob = new Blob([exportData.markdown], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (e) {
                alert(`${chrome.i18n.getMessage("downloadError")}: ` + e.message);
                console.error("处理下载时出错:", e);
            } finally {
                setLoading(false);
            }
        });

        floatingActionPanel.appendChild(exportMarkdownButton);
    }

    function addGenerateKnowledgeCardButton() {
        if (document.getElementById('gmGenerateKnowledgeCardBtn') || !floatingActionPanel) return;

        const knowledgeCardButton = document.createElement('button');
        knowledgeCardButton.id = 'gmGenerateKnowledgeCardBtn';
        Object.assign(knowledgeCardButton.style, floatingButtonStyles);

        const iconHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.20455 20.7955C2.81402 20.4049 2.81402 19.7718 3.20455 19.3812L13.6188 8.96699L15.033 10.3812L4.61879 20.7955C4.22826 21.186 3.59508 21.186 3.20455 20.7955Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.9542 8.98927L15.033 4.06799L16.4472 2.65378C16.8377 2.26325 17.4709 2.26325 17.8614 2.65378L21.3685 6.16089C21.759 6.55141 21.759 7.18458 21.3685 7.5751L19.9542 8.98927Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.8284 3.87868L20.2426 5.29289" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.1924 9.6967L14.3137 11.818" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 16L4.5 14.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 19.5L8 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const buttonText = "生成精美知识卡片";
        knowledgeCardButton.innerHTML = iconHTML + `<span>${buttonText}</span>`;

        const setLoading = (isLoading) => {
            if (isLoading) {
                knowledgeCardButton.disabled = true;
                knowledgeCardButton.innerHTML = `<span class="gm-spinner"></span><span>生成中...</span>`;
            } else {
                knowledgeCardButton.disabled = false;
                knowledgeCardButton.innerHTML = iconHTML + `<span>${buttonText}</span>`;
            }
        };

        knowledgeCardButton.addEventListener('click', async () => {
            setLoading(true);
            const exportData = await getCombinedMarkdownForExport();
            if (!exportData) {
                setLoading(false);
                return;
            }

            const payload = {
                settings: SHARE_SETTINGS,
                editorContent: exportData.markdown,
            };

            console.log('Generate Knowledge Card params:', payload);

            const response = await chrome.runtime.sendMessage({
                action: 'xmlHttpRequest',
                method: "POST",
                url: API_ENDPOINT_SHARE_GOOGLE,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(payload)
            });

            console.log('Raw Generate Knowledge Card response:', response);
            setLoading(false);

            try {
                if (response.type === 'error') {
                    throw new Error(response.error);
                }

                if (response.status >= 200 && response.status < 300 && response.type === 'json') {
                    const result = JSON.parse(response.responseText);
                    if (result.code === 0 && result.data) {
                        const shareUrl = `https://any2card.com/zh/create?id=${result.data}`;
                        window.open(shareUrl, '_blank');
                    } else {
                        throw new Error(result.message || `生成失败 (API Code: ${result.code})`);
                    }
                } else {
                    throw new Error(`生成失败，服务器返回状态: ${response.status}`);
                }
            } catch (error) {
                alert(`生成出错: ${error.message}`);
                console.error('Error processing generation response:', error);
            }
        });

        floatingActionPanel.appendChild(knowledgeCardButton);
    }

    function addCheckboxesToMessages_DeepSeek() {
        // Find all possible conversation content areas
        // Question part: Look for content in the previous sibling node of the grand-parent of the ds-flex node
        // Answer part: Look for content in the previous sibling node of the parent of the ds-flex node
        const flexElements = document.querySelectorAll('.ds-flex');

        flexElements.forEach(flexEl => {
            // Skip already processed conversation areas
            const processedParent = flexEl.closest('.gm-message-item-for-checkbox');
            if (processedParent) {
                return;
            }

            // Check if it's a valid conversation action area
            const actionButtons = flexEl.querySelectorAll('.ds-icon-button');
            if (actionButtons.length < 2) {
                return; // Not the action area we are looking for
            }

            let messageWrapper = null;
            let contentElement = null;

            // Check if it's the answer part - the direct parent of the flex in the answer part is the conversation container
            const parentElement = flexEl.parentElement;
            if (parentElement) {
                const markdownElement = parentElement.querySelector('.ds-markdown.ds-markdown--block');
                if (markdownElement && !markdownElement.contains(flexEl)) {
                    messageWrapper = parentElement;
                    contentElement = markdownElement;
                }
            }

            // Check if it's the question part - for the question part, we need to look up two levels, then find the previous sibling
            if (!messageWrapper) {
                const grandParent = flexEl.parentElement?.parentElement;
                if (grandParent) {
                    // In the question part, content is usually in the previous sibling of the grand-parent
                    const prevSibling = grandParent.previousElementSibling;
                    if (prevSibling) {
                        messageWrapper = prevSibling.parentElement;
                        contentElement = prevSibling;
                    }
                }
            }

            // If a conversation container and content element are found
            if (messageWrapper && contentElement) {
                // Ensure no duplicate additions
                if (messageWrapper.querySelector('.gm-message-checkbox-container')) {
                    return;
                }

                // Add marker class
                messageWrapper.classList.add('gm-message-item-for-checkbox');

                const container = document.createElement('div');
                container.className = 'gm-message-checkbox-container';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'gm-message-checkbox';

                container.appendChild(checkbox);
                messageWrapper.prepend(container); // Add to the beginning of the conversation container
            }
        });
    }

    function addCheckboxesToMessages_Doubao() {
        document.querySelectorAll('div[data-testid="union_message"]').forEach(messageWrapper => {
            if (messageWrapper && !messageWrapper.querySelector('.gm-message-checkbox-container')) {
                messageWrapper.classList.add('gm-message-item-for-checkbox');

                const container = document.createElement('div');
                container.className = 'gm-message-checkbox-container';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'gm-message-checkbox';

                container.appendChild(checkbox);
                messageWrapper.prepend(container);
            }
        });
    }

    function addCheckboxesToMessages() {
        if (onDeepSeek) {
            addCheckboxesToMessages_DeepSeek();
        } else if (onDoubao) {
            addCheckboxesToMessages_Doubao();
        }
    }

    function addSelectAllButton() {
        if (document.getElementById('gmMainSelectAllBtn') || !floatingActionPanel) return;

        const selectAllButton = document.createElement('button');
        selectAllButton.id = 'gmMainSelectAllBtn';
        Object.assign(selectAllButton.style, floatingButtonStyles);

        const iconHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 5.5L4.5 7L7.5 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M3 11.5L4.5 13L7.5 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M3 17.5L4.5 19L7.5 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M11 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M11 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M11 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
        const selectAllText = chrome.i18n.getMessage("selectAllButton");
        const deselectAllText = chrome.i18n.getMessage("deselectAllButton");

        const textSpan = document.createElement('span');
        textSpan.textContent = selectAllText;

        selectAllButton.innerHTML = iconHTML;
        selectAllButton.appendChild(textSpan);

        selectAllButton.addEventListener('click', () => {
            const allCheckboxes = document.querySelectorAll('.gm-message-checkbox');
            if (allCheckboxes.length === 0) {
                return;
            }
            const shouldSelectAll = Array.from(allCheckboxes).some(cb => !cb.checked);
            allCheckboxes.forEach(checkbox => {
                checkbox.checked = shouldSelectAll;
            });
            textSpan.textContent = shouldSelectAll ? deselectAllText : selectAllText;
        });

        floatingActionPanel.appendChild(selectAllButton);
    }

    function runFeatureInjections() {
        findAndProcessTargetButtons();
        addSelectAllButton();
        addExportWordButton();
        addExportPdfButton();
        addExportMindMapButton();
        addExportMarkdownButton();
        addGenerateKnowledgeCardButton();
        addCheckboxesToMessages();
    }

    // --- Main Execution ---
    createCardModal();
    createFloatingActionPanel();
    document.body.classList.add(onDeepSeek ? 'gm-on-deepseek' : (onDoubao ? 'gm-on-doubao' : ''));
    setTimeout(runFeatureInjections, 3000);

    const observer = new MutationObserver((mutationsList) => {
        let needsUpdate = false;
        let needsCheckboxUpdate = false;

        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the added node contains content elements or action buttons
                        if (node.querySelector && (
                            node.querySelector('.ds-flex') ||
                            node.querySelector('.ds-markdown.ds-markdown--block') ||
                            node.querySelector('.ds-icon-button')
                        )) {
                            needsCheckboxUpdate = true;
                        }
                        // Overall update flag
                        needsUpdate = true;
                    }
                });
            }
        }

        // If new content elements are detected, immediately add checkboxes
        if (needsCheckboxUpdate) {
            addCheckboxesToMessages();
        }

        // Overall feature update (may include other functions)
        if (needsUpdate) {
            // Using a timeout to let the DOM settle and avoid over-firing
            setTimeout(runFeatureInjections, 500);
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

})();