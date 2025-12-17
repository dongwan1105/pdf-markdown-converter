/**
 * PDF to Markdown Converter - Main Application
 */

document.addEventListener('DOMContentLoaded', () => {
    // ===== Single Mode DOM Elements =====
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const removeBtn = document.getElementById('removeBtn');
    const convertBtn = document.getElementById('convertBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const resultSection = document.getElementById('resultSection');
    const resultFilename = document.getElementById('resultFilename');
    const markdownOutput = document.getElementById('markdownOutput');
    const previewOutput = document.getElementById('previewOutput');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    // ===== Batch Mode DOM Elements =====
    const modeTabs = document.querySelectorAll('.mode-tab');
    const modeContents = document.querySelectorAll('.mode-content');
    const batchUploadArea = document.getElementById('batchUploadArea');
    const batchFileInput = document.getElementById('batchFileInput');
    const batchFileList = document.getElementById('batchFileList');
    const batchCount = document.getElementById('batchCount');
    const batchFiles = document.getElementById('batchFiles');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const selectFolderBtn = document.getElementById('selectFolderBtn');
    const folderPath = document.getElementById('folderPath');
    const folderNote = document.getElementById('folderNote');
    const batchConvertBtn = document.getElementById('batchConvertBtn');
    const batchProgressContainer = document.getElementById('batchProgressContainer');
    const batchProgressFill = document.getElementById('batchProgressFill');
    const batchProgressText = document.getElementById('batchProgressText');
    const batchResult = document.getElementById('batchResult');
    const batchResultText = document.getElementById('batchResultText');
    const zipLoading = document.getElementById('zipLoading');
    const zipLoadingText = document.getElementById('zipLoadingText');

    // ===== Stock Signal Upload DOM Elements (Batch) =====
    const stockSignalBtn = document.getElementById('stockSignalBtn');
    const stockSignalProgress = document.getElementById('stockSignalProgress');
    const stockSignalProgressFill = document.getElementById('stockSignalProgressFill');
    const stockSignalProgressText = document.getElementById('stockSignalProgressText');
    const stockSignalResult = document.getElementById('stockSignalResult');
    const stockSignalResultIcon = document.getElementById('stockSignalResultIcon');
    const stockSignalResultText = document.getElementById('stockSignalResultText');
    const stockSignalLink = document.getElementById('stockSignalLink');

    // ===== Stock Signal Upload DOM Elements (Single) =====
    const singleStockSignalBtn = document.getElementById('singleStockSignalBtn');
    const singleStockSignalProgress = document.getElementById('singleStockSignalProgress');
    const singleStockSignalProgressFill = document.getElementById('singleStockSignalProgressFill');
    const singleStockSignalProgressText = document.getElementById('singleStockSignalProgressText');
    const singleStockSignalResult = document.getElementById('singleStockSignalResult');
    const singleStockSignalResultIcon = document.getElementById('singleStockSignalResultIcon');
    const singleStockSignalResultText = document.getElementById('singleStockSignalResultText');
    const singleStockSignalLink = document.getElementById('singleStockSignalLink');

    // ===== State =====
    let selectedFile = null;
    let generatedMarkdown = '';
    let generatedFilename = '';
    let batchSelectedFiles = [];
    let selectedFolder = null;
    let supportsFileSystemAPI = 'showDirectoryPicker' in window;
    let lastBatchResults = []; // Store results for Stock Signal upload
    const STOCK_SIGNAL_API = 'https://evening-search.vercel.app/api/upload';

    // ===== Modules =====
    const pdfParser = new PDFParser();
    const markdownGenerator = new MarkdownGenerator();
    const filenameGenerator = new FilenameGenerator();

    // ===== Mode Tab Events =====
    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const mode = tab.dataset.mode;
            modeContents.forEach(content => content.classList.remove('active'));
            document.getElementById(mode + 'Mode').classList.add('active');
        });
    });

    // ===== Single Mode Events =====
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    removeBtn.addEventListener('click', handleRemoveFile);
    convertBtn.addEventListener('click', handleConvert);
    copyBtn.addEventListener('click', handleCopy);
    downloadBtn.addEventListener('click', handleDownload);
    tabBtns.forEach(btn => btn.addEventListener('click', handleTabClick));

    // ===== Batch Mode Events =====
    batchUploadArea.addEventListener('click', () => batchFileInput.click());
    batchUploadArea.addEventListener('dragover', handleBatchDragOver);
    batchUploadArea.addEventListener('dragleave', handleBatchDragLeave);
    batchUploadArea.addEventListener('drop', handleBatchDrop);
    batchFileInput.addEventListener('change', handleBatchFileSelect);
    clearAllBtn.addEventListener('click', handleClearAll);
    selectFolderBtn.addEventListener('click', handleSelectFolder);
    batchConvertBtn.addEventListener('click', handleBatchConvert);

    // Update folder note based on browser support
    if (!supportsFileSystemAPI) {
        folderNote.textContent = '이 브라우저는 폴더 선택을 지원하지 않습니다. ZIP 파일로 다운로드됩니다.';
        folderPath.textContent = 'ZIP 파일로 다운로드';
        selectFolderBtn.classList.add('selected');
    }

    // ===== Single Mode Functions =====
    function handleDragOver(e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            selectFile(files[0]);
        }
    }

    function handleFileSelect(e) {
        if (e.target.files.length > 0) {
            selectFile(e.target.files[0]);
        }
    }

    function selectFile(file) {
        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.classList.add('visible');
        convertBtn.disabled = false;
        resultSection.classList.remove('visible');
    }

    function handleRemoveFile(e) {
        e.stopPropagation();
        selectedFile = null;
        fileInput.value = '';
        fileInfo.classList.remove('visible');
        convertBtn.disabled = true;
    }

    async function handleConvert() {
        if (!selectedFile) return;

        convertBtn.disabled = true;
        progressContainer.classList.add('visible');
        progressFill.style.width = '0%';

        try {
            progressText.textContent = 'PDF 분석 중...';
            const parsedData = await pdfParser.parse(selectedFile, (progress) => {
                progressFill.style.width = `${progress * 0.6}%`;
            });

            progressText.textContent = 'Markdown 변환 중...';
            progressFill.style.width = '70%';
            generatedMarkdown = markdownGenerator.generate(parsedData);

            progressText.textContent = '파일명 생성 중...';
            progressFill.style.width = '90%';
            const firstPageText = parsedData.pages[0]?.text || '';
            generatedFilename = filenameGenerator.generate(firstPageText, selectedFile.name);
            generatedFilename = filenameGenerator.sanitize(generatedFilename);

            progressFill.style.width = '100%';
            progressText.textContent = '완료!';

            setTimeout(() => {
                progressContainer.classList.remove('visible');
                showResult();
            }, 500);

        } catch (error) {
            console.error('Conversion error:', error);
            progressText.textContent = '오류가 발생했습니다: ' + error.message;
            progressFill.style.background = 'var(--error)';
        }
    }

    function showResult() {
        resultFilename.textContent = `📄 ${generatedFilename}.md`;
        markdownOutput.textContent = generatedMarkdown;
        previewOutput.innerHTML = markdownGenerator.toPreviewHTML(generatedMarkdown);
        resultSection.classList.add('visible');
        convertBtn.disabled = false;
        resetSingleStockSignalUI(); // Reset Stock Signal UI for new upload
    }

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(generatedMarkdown);
            showToast('클립보드에 복사되었습니다!');
        } catch (err) {
            showToast('복사에 실패했습니다.');
        }
    }

    function handleDownload() {
        const blob = new Blob([generatedMarkdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${generatedFilename}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('다운로드가 시작되었습니다!');
    }

    function handleTabClick(e) {
        tabBtns.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        const tab = e.target.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tab + 'Tab').classList.add('active');
    }

    // ===== Batch Mode Functions =====
    function handleBatchDragOver(e) {
        e.preventDefault();
        batchUploadArea.classList.add('drag-over');
    }

    function handleBatchDragLeave(e) {
        e.preventDefault();
        batchUploadArea.classList.remove('drag-over');
    }

    function handleBatchDrop(e) {
        e.preventDefault();
        batchUploadArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        processUploadedFiles(files);
    }

    function handleBatchFileSelect(e) {
        const files = Array.from(e.target.files);
        processUploadedFiles(files);
        batchFileInput.value = '';
    }

    // PDF와 ZIP 파일 처리
    async function processUploadedFiles(files) {
        let hasZip = files.some(f =>
            f.type === 'application/zip' ||
            f.type === 'application/x-zip-compressed' ||
            f.name.toLowerCase().endsWith('.zip')
        );

        // ZIP 파일이 있으면 로딩 표시
        if (hasZip) {
            zipLoading.classList.add('visible');
            zipLoadingText.textContent = 'ZIP 파일 처리 중...';
        }

        try {
            for (const file of files) {
                if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                    addSingleFile(file);
                } else if (file.type === 'application/zip' ||
                    file.type === 'application/x-zip-compressed' ||
                    file.name.toLowerCase().endsWith('.zip')) {
                    zipLoadingText.textContent = `${file.name} 압축 해제 중...`;
                    await extractPDFsFromZip(file);
                }
            }
        } finally {
            zipLoading.classList.remove('visible');
        }

        updateBatchFileList();
    }

    // ZIP 파일에서 PDF 추출
    async function extractPDFsFromZip(zipFile) {
        try {
            zipLoadingText.textContent = `${zipFile.name} 로딩 중...`;
            const zip = await JSZip.loadAsync(zipFile);

            const pdfFiles = Object.entries(zip.files).filter(
                ([filename, entry]) => !entry.dir && filename.toLowerCase().endsWith('.pdf')
            );

            const totalPdfs = pdfFiles.length;
            let processed = 0;

            for (const [filename, zipEntry] of pdfFiles) {
                const pdfName = filename.split('/').pop();
                zipLoadingText.textContent = `PDF 추출 중... (${++processed}/${totalPdfs}) ${pdfName}`;

                const blob = await zipEntry.async('blob');
                const pdfFile = new File([blob], pdfName, { type: 'application/pdf' });

                addSingleFile(pdfFile);
            }

            showToast(`${totalPdfs}개 PDF 파일 추출 완료`);
        } catch (error) {
            console.error('ZIP extraction error:', error);
            showToast('ZIP 파일 처리 중 오류가 발생했습니다.');
        }
    }

    // 단일 파일 추가 (중복 체크 포함)
    function addSingleFile(file) {
        const baseName = getBaseFilename(file.name);

        // 기존 파일 중 같은 기본 파일명이 있는지 확인
        const isDuplicate = batchSelectedFiles.some(f => {
            const existingBaseName = getBaseFilename(f.name);
            return existingBaseName === baseName;
        });

        // 중복이 아닌 경우만 추가
        if (!isDuplicate) {
            batchSelectedFiles.push(file);
        }
    }

    function addBatchFiles(files) {
        for (const file of files) {
            const baseName = getBaseFilename(file.name);

            // 기존 파일 중 같은 기본 파일명이 있는지 확인
            const isDuplicate = batchSelectedFiles.some(f => {
                const existingBaseName = getBaseFilename(f.name);
                return existingBaseName === baseName;
            });

            // 중복이 아닌 경우만 추가
            if (!isDuplicate) {
                batchSelectedFiles.push(file);
            }
        }
        updateBatchFileList();
    }

    // 파일명에서 중복 표시 제거한 기본 파일명 반환
    function getBaseFilename(filename) {
        let base = filename.replace(/\.pdf$/i, '');
        // (1), (2), (수정), (수정본), (최종) 등 제거
        base = base.replace(/\s*\(수정\d*\)/g, '');
        base = base.replace(/\s*\(수정본\)/g, '');
        base = base.replace(/\s*\(최종\)/g, '');
        base = base.replace(/\s*\(\d+\)/g, '');
        return base.trim().toLowerCase();
    }

    function updateBatchFileList() {
        batchCount.textContent = `${batchSelectedFiles.length}개 파일 선택됨`;

        if (batchSelectedFiles.length > 0) {
            batchFileList.classList.add('visible');
            batchConvertBtn.disabled = false;
        } else {
            batchFileList.classList.remove('visible');
            batchConvertBtn.disabled = true;
        }

        batchFiles.innerHTML = '';
        batchSelectedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'batch-file-item';
            item.innerHTML = `
                <span class="file-icon">📄</span>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${formatFileSize(file.size)}</span>
                <button class="remove-file-btn" data-index="${index}">✕</button>
            `;
            batchFiles.appendChild(item);
        });

        // Add remove listeners
        batchFiles.querySelectorAll('.remove-file-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                batchSelectedFiles.splice(index, 1);
                updateBatchFileList();
            });
        });

        // Hide result when files change
        batchResult.classList.remove('visible');
    }

    function handleClearAll() {
        batchSelectedFiles = [];
        updateBatchFileList();
    }

    async function handleSelectFolder() {
        if (!supportsFileSystemAPI) {
            showToast('이 브라우저는 폴더 선택을 지원하지 않습니다.');
            return;
        }

        try {
            selectedFolder = await window.showDirectoryPicker();
            folderPath.textContent = selectedFolder.name;
            selectFolderBtn.classList.add('selected');
            showToast(`폴더 선택됨: ${selectedFolder.name}`);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Folder selection error:', err);
            }
        }
    }

    async function handleBatchConvert() {
        if (batchSelectedFiles.length === 0) return;

        batchConvertBtn.disabled = true;
        batchProgressContainer.classList.add('visible');
        batchResult.classList.remove('visible');
        batchProgressFill.style.width = '0%';

        const results = [];
        const totalFiles = batchSelectedFiles.length;

        try {
            for (let i = 0; i < totalFiles; i++) {
                const file = batchSelectedFiles[i];
                batchProgressText.textContent = `변환 중... (${i + 1}/${totalFiles}) ${file.name}`;

                // Parse PDF
                const parsedData = await pdfParser.parse(file, () => { });

                // Generate Markdown
                const markdown = markdownGenerator.generate(parsedData);

                // Generate filename
                const firstPageText = parsedData.pages[0]?.text || '';
                let filename = filenameGenerator.generate(firstPageText, file.name);
                filename = filenameGenerator.sanitize(filename);

                results.push({ filename, markdown });

                // Update progress
                const progress = ((i + 1) / totalFiles) * 100;
                batchProgressFill.style.width = `${progress}%`;
            }

            // Save files
            batchProgressText.textContent = '파일 저장 중...';

            let savedToFolder = false;

            if (supportsFileSystemAPI && selectedFolder) {
                try {
                    // 폴더 저장 시도
                    for (const result of results) {
                        const fileHandle = await selectedFolder.getFileHandle(`${result.filename}.md`, { create: true });
                        const writable = await fileHandle.createWritable({ keepExistingData: false });
                        await writable.write(result.markdown);
                        await writable.close();
                    }
                    savedToFolder = true;
                    batchResultText.textContent = `${results.length}개 파일이 "${selectedFolder.name}" 폴더에 저장되었습니다.`;
                } catch (folderError) {
                    console.warn('폴더 저장 실패, ZIP으로 전환:', folderError);
                    showToast('폴더 권한 만료. ZIP 파일로 다운로드합니다.');
                    savedToFolder = false;
                }
            }

            // 폴더 저장 실패 또는 미지원 시 ZIP 다운로드
            if (!savedToFolder) {
                const zip = new JSZip();
                for (const result of results) {
                    zip.file(`${result.filename}.md`, result.markdown);
                }
                const zipBlob = await zip.generateAsync({ type: 'blob' });

                const url = URL.createObjectURL(zipBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'markdown_files.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                batchResultText.textContent = `${results.length}개 파일이 ZIP으로 다운로드되었습니다.`;
            }

            batchProgressContainer.classList.remove('visible');
            batchResult.classList.add('visible');
            batchConvertBtn.disabled = false;

            // Store results for Stock Signal upload
            lastBatchResults = results;
            resetStockSignalUI();

        } catch (error) {
            console.error('Batch conversion error:', error);
            batchProgressText.textContent = '오류가 발생했습니다: ' + error.message;
            batchProgressFill.style.background = 'var(--error)';
            batchConvertBtn.disabled = false;
        }
    }

    // ===== Utility Functions =====
    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 3000);
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ===== Stock Signal Upload Functions =====
    function resetStockSignalUI() {
        if (!stockSignalBtn) return;
        stockSignalBtn.disabled = false;
        stockSignalProgress.classList.remove('visible');
        stockSignalResult.classList.remove('visible', 'error');
        stockSignalProgressFill.style.width = '0%';
    }

    async function uploadToStockSignal() {
        if (lastBatchResults.length === 0) {
            showToast('업로드할 파일이 없습니다.');
            return;
        }

        stockSignalBtn.disabled = true;
        stockSignalProgress.classList.add('visible');
        stockSignalResult.classList.remove('visible', 'error');
        stockSignalProgressFill.style.width = '0%';

        let successCount = 0;
        let errorCount = 0;
        const totalFiles = lastBatchResults.length;

        for (let i = 0; i < totalFiles; i++) {
            const { filename, markdown } = lastBatchResults[i];
            stockSignalProgressText.textContent = `업로드 중... (${i + 1}/${totalFiles}) ${filename}.md`;

            try {
                const response = await fetch(STOCK_SIGNAL_API, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        filename: `${filename}.md`,
                        content: markdown
                    })
                });

                if (response.ok) {
                    successCount++;
                } else {
                    const error = await response.json();
                    console.error(`Upload failed for ${filename}:`, error);
                    errorCount++;
                }
            } catch (error) {
                console.error(`Upload error for ${filename}:`, error);
                errorCount++;
            }

            // Update progress
            const progress = ((i + 1) / totalFiles) * 100;
            stockSignalProgressFill.style.width = `${progress}%`;
        }

        // Show result
        stockSignalProgress.classList.remove('visible');
        stockSignalResult.classList.add('visible');

        if (errorCount === 0) {
            stockSignalResultIcon.textContent = '✅';
            stockSignalResultText.textContent = `${successCount}개 파일이 Stock Signal에 업로드되었습니다!`;
            stockSignalResult.classList.remove('error');
            stockSignalLink.style.display = 'inline-flex';
        } else if (successCount === 0) {
            stockSignalResultIcon.textContent = '❌';
            stockSignalResultText.textContent = '업로드에 실패했습니다. 네트워크를 확인해주세요.';
            stockSignalResult.classList.add('error');
            stockSignalLink.style.display = 'none';
            stockSignalBtn.disabled = false; // Allow retry
        } else {
            stockSignalResultIcon.textContent = '⚠️';
            stockSignalResultText.textContent = `${successCount}개 성공, ${errorCount}개 실패`;
            stockSignalResult.classList.add('error');
            stockSignalLink.style.display = 'inline-flex';
            stockSignalBtn.disabled = false; // Allow retry
        }
    }

    // Stock Signal button event listener (Batch)
    if (stockSignalBtn) {
        stockSignalBtn.addEventListener('click', uploadToStockSignal);
    }

    // ===== Single Mode Stock Signal Upload =====
    function resetSingleStockSignalUI() {
        if (!singleStockSignalBtn) return;
        singleStockSignalBtn.disabled = false;
        singleStockSignalProgress.classList.remove('visible');
        singleStockSignalResult.classList.remove('visible', 'error');
        singleStockSignalProgressFill.style.width = '0%';
    }

    async function uploadSingleToStockSignal() {
        if (!generatedMarkdown || !generatedFilename) {
            showToast('업로드할 파일이 없습니다. 먼저 PDF를 변환해주세요.');
            return;
        }

        singleStockSignalBtn.disabled = true;
        singleStockSignalProgress.classList.add('visible');
        singleStockSignalResult.classList.remove('visible', 'error');
        singleStockSignalProgressFill.style.width = '0%';
        singleStockSignalProgressText.textContent = `업로드 중... ${generatedFilename}.md`;

        try {
            singleStockSignalProgressFill.style.width = '50%';

            const response = await fetch(STOCK_SIGNAL_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filename: `${generatedFilename}.md`,
                    content: generatedMarkdown
                })
            });

            singleStockSignalProgressFill.style.width = '100%';

            // Show result
            singleStockSignalProgress.classList.remove('visible');
            singleStockSignalResult.classList.add('visible');

            if (response.ok) {
                singleStockSignalResultIcon.textContent = '✅';
                singleStockSignalResultText.textContent = 'Stock Signal에 업로드되었습니다!';
                singleStockSignalResult.classList.remove('error');
                singleStockSignalLink.style.display = 'inline-flex';
            } else {
                const error = await response.json();
                console.error('Upload failed:', error);
                singleStockSignalResultIcon.textContent = '❌';
                singleStockSignalResultText.textContent = `업로드 실패: ${error.error || '알 수 없는 오류'}`;
                singleStockSignalResult.classList.add('error');
                singleStockSignalLink.style.display = 'none';
                singleStockSignalBtn.disabled = false; // Allow retry
            }
        } catch (error) {
            console.error('Upload error:', error);
            singleStockSignalProgress.classList.remove('visible');
            singleStockSignalResult.classList.add('visible', 'error');
            singleStockSignalResultIcon.textContent = '❌';
            singleStockSignalResultText.textContent = '업로드에 실패했습니다. 네트워크를 확인해주세요.';
            singleStockSignalLink.style.display = 'none';
            singleStockSignalBtn.disabled = false; // Allow retry
        }
    }

    // Stock Signal button event listener (Single)
    if (singleStockSignalBtn) {
        singleStockSignalBtn.addEventListener('click', uploadSingleToStockSignal);
    }
});
