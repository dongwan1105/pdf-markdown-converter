/**
 * Markdown Generator Module
 * 추출된 텍스트와 링크를 Markdown으로 변환합니다.
 */

class MarkdownGenerator {
    constructor() {
        this.linkMap = new Map();
        this.processedUrls = new Set();
    }

    /**
     * 파싱된 PDF 데이터를 Markdown으로 변환합니다.
     */
    generate(parsedData) {
        const { pages, links } = parsedData;
        this.processedUrls.clear();

        // 링크 맵 구축
        this._buildLinkMap(links);

        let markdown = '';

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            let pageText = page.text;
            const pageLinks = page.links || [];

            // 텍스트 정제
            pageText = this._cleanText(pageText);

            // 링크를 Markdown 형식으로 변환 (기사 제목에 링크 연결)
            pageText = this._embedLinksInText(pageText, pageLinks);

            // 섹션 구분
            pageText = this._detectAndFormatHeadings(pageText);

            markdown += pageText;

            // 페이지 연결 처리
            if (i < pages.length - 1) {
                // 현재 페이지 마지막 문자 확인
                const trimmedText = pageText.trim();
                const lastChar = trimmedText[trimmedText.length - 1];

                // 문장이 완전히 끝났으면(마침표, 물음표, 느낌표, 따옴표 등) 줄바꿈 추가
                // 그렇지 않으면 공백만 추가하여 자연스럽게 이어짐
                if (/[.?!。」』"']$/.test(trimmedText)) {
                    markdown += '\n';
                } else {
                    markdown += ' ';
                }
            }
        }

        // URL이 남아있으면 제거 (이미 링크로 변환됨)
        markdown = this._removeStandaloneUrls(markdown);

        // 최종 정제
        markdown = this._finalCleanup(markdown);

        return markdown;
    }

    /**
     * 링크 맵을 구축합니다.
     */
    _buildLinkMap(links) {
        this.linkMap.clear();

        for (const link of links) {
            if (link.text && link.url) {
                const normalizedText = link.text.trim();
                if (normalizedText.length > 0 && !normalizedText.startsWith('http')) {
                    this.linkMap.set(normalizedText, link.url);
                }
            }
        }
    }

    /**
     * 텍스트를 정제합니다.
     */
    _cleanText(text) {
        text = text.replace(/[ \t]+/g, ' ');
        text = text.replace(/\n{3,}/g, '\n\n');
        text = text.split('\n').map(line => line.trim()).join('\n');
        return text;
    }

    /**
     * 텍스트에 링크를 임베드합니다 (핵심 로직).
     */
    _embedLinksInText(text, links) {
        // 가장 긴 텍스트부터 처리 (부분 일치 방지)
        const sortedLinks = [...links].sort((a, b) =>
            (b.text?.length || 0) - (a.text?.length || 0)
        );

        for (const link of sortedLinks) {
            if (!link.text || !link.url) continue;

            const linkText = link.text.trim();
            if (linkText.length < 3) continue; // 너무 짧은 텍스트 스킵
            if (linkText.startsWith('http')) continue; // URL 자체는 스킵
            if (this.processedUrls.has(link.url)) continue; // 중복 방지

            // 텍스트에서 링크 텍스트 찾기
            const escapedText = this._escapeRegex(linkText);

            // 이미 Markdown 링크 안에 있는지 확인
            if (text.includes(`[${linkText}](`)) continue;

            // 정확한 위치에서 첫 번째 매칭만 변환
            const regex = new RegExp(escapedText);
            if (regex.test(text)) {
                const markdownLink = `[${linkText}](${link.url})`;
                text = text.replace(regex, markdownLink);
                this.processedUrls.add(link.url);
            }
        }

        return text;
    }

    /**
     * 단독으로 있는 URL을 제거합니다 (이미 텍스트에 링크로 포함됨).
     */
    _removeStandaloneUrls(text) {
        // 이미 처리된 URL들을 텍스트에서 제거
        for (const url of this.processedUrls) {
            // URL만 단독으로 있는 경우 제거 (링크 안에 있는 건 제외)
            const escapedUrl = this._escapeRegex(url);
            // ](url) 패턴이 아닌 경우만 제거
            const standalonePattern = new RegExp(`(?<!\\]\\()${escapedUrl}(?!\\))`, 'g');
            text = text.replace(standalonePattern, '');
        }

        // 빈 줄 정리
        text = text.replace(/\n{3,}/g, '\n\n');

        return text;
    }

    /**
     * 정규식 특수문자를 이스케이프합니다.
     */
    _escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 제목을 감지하고 Markdown 헤딩으로 변환합니다.
     */
    _detectAndFormatHeadings(text) {
        const lines = text.split('\n');
        const formattedLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            if (this._isDateHeading(line) && !line.startsWith('#')) {
                line = `# ${line}`;
            }
            else if (this._isSectionHeading(line) && !line.startsWith('#')) {
                line = `## ${line}`;
            }

            formattedLines.push(line);
        }

        return formattedLines.join('\n');
    }

    /**
     * 날짜 헤딩인지 확인합니다.
     */
    _isDateHeading(line) {
        const trimmed = line.trim();
        const datePatterns = [
            /^\d{4}\.\d{1,2}\.\d{1,2}/,
            /^\d{6}\s*\([월화수목금토일]\)/,
            /^\[\s*\d+월\s*\d+일/,
        ];
        return datePatterns.some(pattern => pattern.test(trimmed));
    }

    /**
     * 섹션 헤딩인지 확인합니다.
     */
    _isSectionHeading(line) {
        const trimmed = line.trim();
        if (trimmed.length > 50 || trimmed.length === 0) return false;

        const headingPatterns = [
            /^<\s*.+\s*>$/,  // < 개별주 > 형식
            /^【.+】$/,      // 【제목】 형식
            /^\[.+\]$/,     // [제목] 형식 (단, 링크가 아닌 경우)
        ];

        if (headingPatterns.some(p => p.test(trimmed))) return true;

        const headingKeywords = ['뉴스', '기사', '요약', '분석', '전망', '이슈', '개별주', '시장', '종목'];
        return headingKeywords.some(keyword => trimmed.includes(keyword) && trimmed.length < 30);
    }

    /**
     * 최종 정제를 수행합니다.
     */
    _finalCleanup(markdown) {
        // 종목명 패턴 앞에 빈 줄 추가 (●종목명, ◆종목명, ★종목명 등)
        // 기사 내용과 다음 종목 사이 가독성 향상
        markdown = markdown.replace(/\n(●|◆|★|■|▶|►)/g, '\n\n$1');

        // 연속된 빈 줄은 최대 2개로 제한
        markdown = markdown.replace(/\n{3,}/g, '\n\n');

        // 헤딩 앞뒤 공백 정리
        markdown = markdown.replace(/\n(#{1,6})/g, '\n\n$1');
        markdown = markdown.replace(/(#{1,6}[^\n]+)\n(?!\n)/g, '$1\n\n');

        markdown = markdown.trim();
        return markdown;
    }

    /**
     * Markdown을 HTML 미리보기로 변환합니다.
     */
    toPreviewHTML(markdown) {
        let html = markdown;

        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        html = html.replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1" target="_blank">$1</a>');

        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        html = html.replace(/^---$/gm, '<hr>');
        html = html.replace(/\n\n/g, '</p><p>');
        html = html.replace(/\n/g, '<br>');

        html = `<p>${html}</p>`;
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<h[1-6]>)/g, '$1');
        html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<hr>)<\/p>/g, '$1');

        return html;
    }
}

window.MarkdownGenerator = MarkdownGenerator;
