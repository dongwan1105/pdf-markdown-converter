/**
 * Filename Generator Module
 */

class FilenameGenerator {
    constructor() {
        this.dayMap = { '월': '월', '화': '화', '수': '수', '목': '목', '금': '금', '토': '토', '일': '일' };
    }

    generate(firstPageText, originalFilename = '') {
        const dateInfo = this._extractDateFromText(firstPageText) || this._extractDateFromFilename(originalFilename);
        const title = this._extractTitle(firstPageText, originalFilename);

        if (dateInfo && title) return `${dateInfo} - ${title}`;
        if (dateInfo) return dateInfo;
        if (title) return title;
        return this._getCurrentDate();
    }

    _extractDateFromText(text) {
        const lines = text.split('\n').slice(0, 15);
        for (const line of lines) {
            const trimmed = line.trim();

            // 패턴 1: 2024.10.18.(금) 또는 2024.10.18(금)
            let match = trimmed.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})\.?\s*\(([월화수목금토일])\)/);
            if (match) {
                const [, year, month, day, dow] = match;
                return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}.(${dow})`;
            }

            // 패턴 2: 2024년 10월 18일 (금) 또는 2024년 10월 18일(금)
            match = trimmed.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*\(?([월화수목금토일])\)?/);
            if (match) {
                const [, year, month, day, dow] = match;
                return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}.(${dow})`;
            }

            // 패턴 3: 241018(금) - 6자리 날짜
            match = trimmed.match(/(\d{2})(\d{2})(\d{2})\s*\(([월화수목금토일])\)/);
            if (match) {
                const [, yy, mm, dd, dow] = match;
                return `20${yy}.${mm}.${dd}.(${dow})`;
            }

            // 패턴 4: [ 10월 18일 (금) ] - 월/일만 있는 경우 (연도는 현재 연도 사용)
            match = trimmed.match(/(\d{1,2})월\s*(\d{1,2})일\s*\(?([월화수목금토일])\)?/);
            if (match) {
                const [, month, day, dow] = match;
                const year = new Date().getFullYear();
                return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}.(${dow})`;
            }
        }
        return null;
    }

    _extractDateFromFilename(filename) {
        if (!filename) return null;
        let match = filename.match(/(\d{2})(\d{2})(\d{2})\s*\(([월화수목금토일])\)/);
        if (match) {
            const [, yy, mm, dd, dow] = match;
            return `20${yy}.${mm}.${dd}.(${dow})`;
        }
        return null;
    }

    _extractTitle(text, originalFilename) {
        if (originalFilename) {
            let title = originalFilename.replace(/\.pdf$/i, '');

            // 다양한 날짜 형식 제거
            // 241018(금), 241018 (금)
            title = title.replace(/\d{6}\s*\([월화수목금토일]\)\s*/g, '');
            // 2024.10.18.(금), 2024.10.18(금), 2024.10.18. (금)
            title = title.replace(/\d{4}\.\d{1,2}\.\d{1,2}\.?\s*\([월화수목금토일]\)\s*/g, '');
            // 2024년 10월 18일 (금), 2024년 10월 18일(금)
            title = title.replace(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일\s*\(?[월화수목금토일]\)?\s*/g, '');
            // [ 10월 18일 (금) ], 10월 18일 (금)
            title = title.replace(/\[?\s*\d{1,2}월\s*\d{1,2}일\s*\(?[월화수목금토일]\)?\s*\]?\s*/g, '');
            // 앞뒤 - 제거
            title = title.replace(/^[\s\-]+|[\s\-]+$/g, '');

            title = title.trim();

            if (title.length > 0) {
                return this._toTitleCase(title);
            }
        }
        return null;
    }

    // Title Case 변환: "signal evening" → "Signal Evening"
    _toTitleCase(str) {
        return str
            .split(' ')
            .map(word => {
                if (word.length === 0) return word;
                // 영문만 변환 (한글은 그대로 유지)
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
    }

    _getDayOfWeek(year, month, day) {
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    }

    _getCurrentDate() {
        const now = new Date();
        const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
        return `${y}.${m}.${d}.(${this._getDayOfWeek(y, m, d)})`;
    }

    sanitize(filename) {
        // 중복 파일 표시 제거: (1), (2), (수정), (수정본), (최종) 등
        filename = filename.replace(/\s*\(수정\d*\)/g, '');
        filename = filename.replace(/\s*\(수정본\)/g, '');
        filename = filename.replace(/\s*\(최종\)/g, '');
        filename = filename.replace(/\s*\(\d+\)/g, '');

        // 파일시스템 금지 문자 제거
        filename = filename.replace(/[<>:"/\\|?*]/g, '');

        // 연속 공백 정리
        filename = filename.replace(/\s+/g, ' ').trim();

        return filename;
    }
}

window.FilenameGenerator = FilenameGenerator;
