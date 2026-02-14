function sanitizeFileName(raw: string): string {
  const cleaned = raw.replace(/[\\/:*?"<>|]/g, '_').trim();
  return cleaned || 'LunaTV';
}

function createTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function saveVideoScreenshot(
  video: HTMLVideoElement | null | undefined,
  fileBaseName: string,
): string {
  if (!video) {
    throw new Error('播放器尚未准备好');
  }

  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('当前画面尚未可截图，请稍后重试');
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('无法创建截图画布');
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  let dataUrl = '';
  try {
    dataUrl = canvas.toDataURL('image/png');
  } catch {
    throw new Error('截图失败：当前视频源不支持跨域截图');
  }

  const filename = `${sanitizeFileName(fileBaseName)}-${createTimestamp()}.png`;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();

  return filename;
}
