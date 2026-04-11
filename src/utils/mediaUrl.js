export function resolveMediaUrl(fileUrl) {
    if (!fileUrl) return '';

    if (/^https?:\/\//i.test(fileUrl) || fileUrl.startsWith('//')) {
        return fileUrl;
    }

    if (fileUrl.startsWith('/')) {
        return fileUrl;
    }

    if (fileUrl.startsWith('media/')) {
        return `/${fileUrl}`;
    }

    return `/media/${fileUrl}`;
}
