/**
 * PDF Parser Module
 * PDF.js를 사용하여 PDF에서 텍스트와 링크를 추출합니다.
 */

class PDFParser {
    constructor() {
        // PDF.js 워커 설정
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    /**
     * PDF 파일을 파싱하여 텍스트와 링크를 추출합니다.
     * @param {File} file - PDF 파일
     * @param {Function} onProgress - 진행률 콜백 (0-100)
     * @returns {Promise<{pages: Array, links: Array}>}
     */
    async parse(file, onProgress = () => { }) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        const totalPages = pdf.numPages;
        const pages = [];
        const allLinks = [];

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });

            // 텍스트 추출
            const textContent = await page.getTextContent();

            // 텍스트 아이템에 정확한 위치 정보 추가
            const textItems = this._processTextItems(textContent.items, viewport);
            const pageText = this._buildTextFromItems(textItems);

            // 링크 추출
            const annotations = await page.getAnnotations();
            const pageLinks = this._extractLinksWithText(annotations, textItems, viewport);

            pages.push({
                pageNumber: pageNum,
                text: pageText,
                textItems: textItems,
                links: pageLinks
            });

            allLinks.push(...pageLinks);

            // 진행률 업데이트
            const progress = Math.round((pageNum / totalPages) * 100);
            onProgress(progress);
        }

        return {
            pages,
            links: allLinks,
            totalPages
        };
    }

    /**
     * 텍스트 아이템을 처리하여 위치 정보를 추가합니다.
     * @private
     */
    _processTextItems(items, viewport) {
        return items.map(item => {
            if (!item.str || !item.transform) return null;

            const tx = item.transform;
            // PDF 좌표를 뷰포트 좌표로 변환
            const x = tx[4];
            const y = tx[5];
            const width = item.width || 0;
            const height = item.height || Math.abs(tx[0]) || 12;

            return {
                str: item.str,
                x: x,
                y: y,
                width: width,
                height: height,
                // 바운딩 박스 (PDF 좌표계: 아래에서 위로)
                bbox: [x, y, x + width, y + height]
            };
        }).filter(item => item !== null);
    }

    /**
     * 텍스트 아이템에서 텍스트를 구성합니다.
     * @private
     */
    _buildTextFromItems(textItems) {
        if (textItems.length === 0) return '';

        // Y 좌표로 정렬 (위에서 아래로)
        const sorted = [...textItems].sort((a, b) => b.y - a.y || a.x - b.x);

        let text = '';
        let lastY = null;
        let lastX = null;

        for (const item of sorted) {
            const currentY = Math.round(item.y);

            // Y 좌표가 크게 변하면 새 줄
            if (lastY !== null && Math.abs(currentY - lastY) > 5) {
                text += '\n';
                lastX = null;
            } else if (lastX !== null) {
                // 같은 줄에서 간격이 있으면 공백 추가
                const gap = item.x - lastX;
                if (gap > 5 && !text.endsWith(' ') && !text.endsWith('\n')) {
                    text += ' ';
                }
            }

            text += item.str;
            lastY = currentY;
            lastX = item.x + item.width;
        }

        return text.trim();
    }

    /**
     * 링크와 해당 텍스트를 추출합니다.
     * @private
     */
    _extractLinksWithText(annotations, textItems, viewport) {
        const links = [];

        for (const annotation of annotations) {
            if (annotation.subtype !== 'Link' || !annotation.url) continue;

            const rect = annotation.rect;
            if (!rect || rect.length < 4) continue;

            const [x1, y1, x2, y2] = rect;
            const linkText = this._findTextInArea(textItems, x1, y1, x2, y2);

            if (linkText) {
                links.push({
                    url: annotation.url,
                    text: linkText.trim(),
                    rect: rect
                });
            }
        }

        return links;
    }

    /**
     * 특정 영역 내의 텍스트를 찾습니다.
     * @private
     */
    _findTextInArea(textItems, x1, y1, x2, y2) {
        // 영역을 약간 확장하여 텍스트 찾기 (PDF 좌표계 특성 고려)
        const padding = 5;
        const minX = Math.min(x1, x2) - padding;
        const maxX = Math.max(x1, x2) + padding;
        const minY = Math.min(y1, y2) - padding;
        const maxY = Math.max(y1, y2) + padding;

        // 영역 내 텍스트 아이템 수집
        const matchingItems = [];

        for (const item of textItems) {
            const itemCenterY = item.y + (item.height / 2);

            // 텍스트의 Y 중심이 영역 내에 있는지 확인
            if (item.x >= minX - item.width &&
                item.x <= maxX &&
                itemCenterY >= minY &&
                itemCenterY <= maxY) {
                matchingItems.push(item);
            }
        }

        // X 좌표로 정렬하여 텍스트 조합
        matchingItems.sort((a, b) => a.x - b.x);

        return matchingItems.map(item => item.str).join('');
    }
}

// 전역으로 내보내기
window.PDFParser = PDFParser;
