import React, { useState } from 'react';

type TemplateId =
  | 'classic'
  | 'minimal'
  | 'counter'
  | 'poster';

type ColorThemeId =
  | 'black'
  | 'white'
  | 'navy'
  | 'green'
  | 'beige'
  | 'burgundy';

type PrintSizeId =
  | 'a4'
  | 'a5'
  | 'square'
  | 'landscape';

type PrintSize = {
  id: PrintSizeId;
  label: string;
  hint: string;
  width: number;
  height: number;
  pdfWidthMm: number;
  pdfHeightMm: number;
};

type ColorTheme = {
  id: ColorThemeId;
  label: string;
  bg: string;
  fg: string;
  muted: string;
  border: string;
};


const encodePdfText = (value: string) =>
  new TextEncoder().encode(value);

const concatPdfBytes = (
  parts: Uint8Array[]
) => {
  const totalLength =
    parts.reduce(
      (sum, part) =>
        sum + part.length,
      0
    );

  const output =
    new Uint8Array(totalLength);

  let offset = 0;

  parts.forEach(part => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
};

const createSinglePagePdf = ({
  jpegBytes,
  imageWidth,
  imageHeight,
  pageWidthMm,
  pageHeightMm
}: {
  jpegBytes: Uint8Array;
  imageWidth: number;
  imageHeight: number;
  pageWidthMm: number;
  pageHeightMm: number;
}) => {
  const mmToPt =
    72 / 25.4;

  const pageWidth =
    pageWidthMm * mmToPt;

  const pageHeight =
    pageHeightMm * mmToPt;

  const content =
    `q\n${pageWidth.toFixed(3)} 0 0 ${pageHeight.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`;

  const contentBytes =
    encodePdfText(content);

  const objects: Uint8Array[] = [
    new Uint8Array(),
    encodePdfText(
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
    ),
    encodePdfText(
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'
    ),
    encodePdfText(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(3)} ${pageHeight.toFixed(3)}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n`
    ),
    concatPdfBytes([
      encodePdfText(
        `4 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`
      ),
      contentBytes,
      encodePdfText(
        'endstream\nendobj\n'
      )
    ]),
    concatPdfBytes([
      encodePdfText(
        `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
      ),
      jpegBytes,
      encodePdfText(
        '\nendstream\nendobj\n'
      )
    ])
  ];

  const header =
    encodePdfText(
      '%PDF-1.4\n% Bookly\n'
    );

  const parts: Uint8Array[] = [
    header
  ];

  const offsets = [0];

  let currentOffset =
    header.length;

  for (
    let index = 1;
    index <= 5;
    index += 1
  ) {
    offsets[index] =
      currentOffset;

    parts.push(objects[index]);

    currentOffset +=
      objects[index].length;
  }

  const xrefOffset =
    currentOffset;

  const xrefEntries =
    offsets
      .slice(1)
      .map(offset =>
        `${String(offset).padStart(10, '0')} 00000 n \n`
      )
      .join('');

  const trailer =
    encodePdfText(
      `xref\n0 6\n0000000000 65535 f \n${xrefEntries}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
    );

  parts.push(trailer);

  return new Blob(
    [concatPdfBytes(parts)],
    {
      type: 'application/pdf'
    }
  );
};

export function QrPrintCard({
  business,
  qrDataUrl,
  open,
  onClose,
  t
}: {
  business: any;
  qrDataUrl: string;
  open: boolean;
  onClose: () => void;
  t: (key: string, fallback?: string) => string;
}) {
  const [template, setTemplate] =
    useState<TemplateId>('classic');

  const [colorTheme, setColorTheme] =
    useState<ColorThemeId>('white');

  const [printSize, setPrintSize] =
  useState<PrintSizeId>('a4');

  if (!open || !qrDataUrl) {
    return null;
  }

  const businessName = String(
    business?.name ||
      t(
        'owner.businessNameFallback',
        'Ваш бизнес'
      )
  );

  const templateOptions: Array<{
    id: TemplateId;
    label: string;
    hint: string;
  }> = [
    {
      id: 'classic',
      label: t(
        'owner.qrTemplateClassic',
        'Classic'
      ),
      hint: t(
        'owner.qrTemplateClassicHint',
        'Универсальный'
      )
    },
    {
      id: 'minimal',
      label: t(
        'owner.qrTemplateMinimal',
        'Minimal'
      ),
      hint: t(
        'owner.qrTemplateMinimalHint',
        'Чистый и простой'
      )
    },
    {
      id: 'counter',
      label: t(
        'owner.qrTemplateCounter',
        'Counter'
      ),
      hint: t(
        'owner.qrTemplateCounterHint',
        'Для стойки'
      )
    },
    {
      id: 'poster',
      label: t(
        'owner.qrTemplatePoster',
        'Poster'
      ),
      hint: t(
        'owner.qrTemplatePosterHint',
        'Для стены'
      )
    }
  ];

  const colorThemes: ColorTheme[] = [
    {
      id: 'black',
      label: t(
        'owner.qrColorBlack',
        'Чёрный'
      ),
      bg: '#111111',
      fg: '#ffffff',
      muted: '#c7cbd0',
      border: '#303030'
    },
    {
      id: 'white',
      label: t(
        'owner.qrColorWhite',
        'Белый'
      ),
      bg: '#ffffff',
      fg: '#111111',
      muted: '#707780',
      border: '#e5e7eb'
    },
    {
      id: 'navy',
      label: t(
        'owner.qrColorNavy',
        'Тёмно-синий'
      ),
      bg: '#132238',
      fg: '#ffffff',
      muted: '#c8d2df',
      border: '#31445f'
    },
    {
      id: 'green',
      label: t(
        'owner.qrColorGreen',
        'Зелёный'
      ),
      bg: '#18392f',
      fg: '#ffffff',
      muted: '#c9ddd6',
      border: '#34594d'
    },
    {
      id: 'beige',
      label: t(
        'owner.qrColorBeige',
        'Бежевый'
      ),
      bg: '#efe4d5',
      fg: '#2e251e',
      muted: '#74685e',
      border: '#d8c7b3'
    },
    {
      id: 'burgundy',
      label: t(
        'owner.qrColorBurgundy',
        'Бордовый'
      ),
      bg: '#5c2330',
      fg: '#ffffff',
      muted: '#ead4da',
      border: '#7b3d49'
    }
  ];

  const printSizes: PrintSize[] = [
  {
    id: 'a4',
    label: 'A4',
    hint: t(
      'owner.qrSizeA4Hint',
      'Для стены'
    ),
    width: 1654,
    height: 2339,
    pdfWidthMm: 210,
    pdfHeightMm: 297
  },
  {
    id: 'a5',
    label: 'A5',
    hint: t(
      'owner.qrSizeA5Hint',
      'Компактный'
    ),
    width: 1169,
    height: 1654,
    pdfWidthMm: 148,
    pdfHeightMm: 210
  },
  {
    id: 'square',
    label: t(
      'owner.qrSizeSquare',
      'Square'
    ),
    hint: t(
      'owner.qrSizeSquareHint',
      'Квадрат'
    ),
    width: 1800,
    height: 1800,
    pdfWidthMm: 210,
    pdfHeightMm: 210
  },
  {
    id: 'landscape',
    label: t(
      'owner.qrSizeLandscape',
      'Landscape'
    ),
    hint: t(
      'owner.qrSizeLandscapeHint',
      'Горизонтальный'
    ),
    width: 2339,
    height: 1654,
    pdfWidthMm: 297,
    pdfHeightMm: 210
  }
];

const selectedPrintSize =
  printSizes.find(
    item => item.id === printSize
  ) || printSizes[0];

  const theme =
    colorThemes.find(
      item => item.id === colorTheme
    ) || colorThemes[1];

  const previewStyle = {
    '--qr-theme-bg': theme.bg,
    '--qr-theme-fg': theme.fg,
    '--qr-theme-muted': theme.muted,
    '--qr-theme-border': theme.border
  } as React.CSSProperties;

  const loadQrImage = async () => {
    const image = new Image();

    await new Promise<void>(
      (resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
          reject(
            new Error(
              'QR image failed to load'
            )
          );
        image.src = qrDataUrl;
      }
    );

    return image;
  };

  const setFont = (
    ctx: CanvasRenderingContext2D,
    weight: number,
    size: number
  ) => {
    ctx.font =
      `${weight} ${size}px Arial, sans-serif`;
  };

  const drawFittedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    startSize: number,
    minSize: number,
    weight: number,
    color: string
  ) => {
    let size = startSize;

    setFont(
      ctx,
      weight,
      size
    );

    while (
      size > minSize &&
      ctx.measureText(text).width > maxWidth
    ) {
      size -= 2;
      setFont(
        ctx,
        weight,
        size
      );
    }

    ctx.fillStyle = color;
    ctx.fillText(
      text,
      x,
      y
    );
  };

  const roundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.beginPath();
    ctx.roundRect(
      x,
      y,
      width,
      height,
      radius
    );
  };

  const drawQrCard = (
    ctx: CanvasRenderingContext2D,
    qrImage: HTMLImageElement,
    x: number,
    y: number,
    size: number,
    padding: number,
    radius: number
  ) => {
    ctx.fillStyle = '#ffffff';

    roundedRect(
      ctx,
      x,
      y,
      size,
      size,
      radius
    );
    ctx.fill();

    ctx.drawImage(
      qrImage,
      x + padding,
      y + padding,
      size - padding * 2,
      size - padding * 2
    );
  };

  const drawClassic = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    qrImage: HTMLImageElement
  ) => {
    canvas.width = 1600;
    canvas.height = 2200;

    ctx.fillStyle = theme.bg;
    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    drawFittedText(
      ctx,
      'BOOKLY',
      800,
      180,
      1200,
      72,
      54,
      900,
      theme.fg
    );

    drawFittedText(
      ctx,
      businessName,
      800,
      320,
      1280,
      62,
      38,
      800,
      theme.fg
    );

    setFont(ctx, 500, 34);
    ctx.fillStyle = theme.muted;
    ctx.fillText(
      t(
        'owner.onlineBooking',
        'Онлайн-запись'
      ),
      800,
      385
    );

    const cardX = 150;
    const cardY = 500;
    const cardW = 1300;
    const cardH = 1300;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 4;

    roundedRect(
      ctx,
      cardX,
      cardY,
      cardW,
      cardH,
      45
    );
    ctx.fill();
    ctx.stroke();

    const qrSize = 1050;

    ctx.drawImage(
      qrImage,
      (1600 - qrSize) / 2,
      cardY + 125,
      qrSize,
      qrSize
    );

    setFont(ctx, 800, 58);
    ctx.fillStyle = theme.fg;
    ctx.fillText(
      t(
        'owner.bookOnline',
        'Запишитесь онлайн'
      ),
      800,
      1910
    );

    setFont(ctx, 500, 34);
    ctx.fillStyle = theme.muted;
    ctx.fillText(
      t(
        'owner.scanQr',
        'Отсканируйте QR-код'
      ),
      800,
      1970
    );
    ctx.fillText(
      t(
        'owner.phoneCamera',
        'камерой телефона'
      ),
      800,
      2025
    );

    setFont(ctx, 700, 24);
    ctx.fillStyle = theme.muted;
    ctx.fillText(
      'POWERED BY BOOKLY',
      800,
      2135
    );
  };

  const drawMinimal = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    qrImage: HTMLImageElement
  ) => {
    canvas.width = 1600;
    canvas.height = 2000;

    ctx.fillStyle = theme.bg;
    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.strokeStyle = theme.fg;
    ctx.lineWidth = 12;
    ctx.strokeRect(
      55,
      55,
      1490,
      1890
    );

    ctx.textAlign = 'center';

    setFont(ctx, 900, 42);
    ctx.fillStyle = theme.fg;
    ctx.fillText(
      'BOOKLY',
      800,
      165
    );

    drawFittedText(
      ctx,
      businessName,
      800,
      285,
      1320,
      68,
      40,
      800,
      theme.fg
    );

    drawQrCard(
      ctx,
      qrImage,
      190,
      370,
      1220,
      30,
      30
    );

    setFont(ctx, 800, 48);
    ctx.fillStyle = theme.fg;
    ctx.fillText(
      t(
        'owner.scanToBook',
        'Сканируйте для записи'
      ),
      800,
      1705
    );

    setFont(ctx, 500, 30);
    ctx.fillStyle = theme.muted;
    ctx.fillText(
      t(
        'owner.onlineBooking247',
        'Онлайн-запись 24/7'
      ),
      800,
      1765
    );

    setFont(ctx, 700, 22);
    ctx.fillStyle = theme.muted;
    ctx.fillText(
      'BOOKLY',
      800,
      1885
    );
  };

  const drawCounter = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    qrImage: HTMLImageElement
  ) => {
    canvas.width = 2000;
    canvas.height = 1200;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.fillStyle = theme.bg;
    ctx.fillRect(
      0,
      0,
      900,
      1200
    );

    ctx.textAlign = 'center';

    setFont(ctx, 900, 48);
    ctx.fillStyle = theme.fg;
    ctx.fillText(
      'BOOKLY',
      450,
      175
    );

    drawFittedText(
      ctx,
      businessName,
      450,
      360,
      720,
      72,
      42,
      800,
      theme.fg
    );

    setFont(ctx, 600, 38);
    ctx.fillStyle = theme.muted;
    ctx.fillText(
      t(
        'owner.onlineBooking247',
        'Онлайн-запись 24/7'
      ),
      450,
      455
    );

    setFont(ctx, 800, 48);
    ctx.fillStyle = theme.fg;
    ctx.fillText(
      t(
        'owner.scanToBook',
        'Сканируйте для записи'
      ),
      450,
      785
    );

    setFont(ctx, 500, 30);
    ctx.fillStyle = theme.muted;
    ctx.fillText(
      t(
        'owner.chooseServiceTime',
        'Выберите услугу, специалиста и время'
      ),
      450,
      850
    );

    const qrCardX = 1050;
    const qrCardY = 150;
    const qrCardW = 800;
    const qrCardH = 900;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 4;

    roundedRect(
      ctx,
      qrCardX,
      qrCardY,
      qrCardW,
      qrCardH,
      42
    );
    ctx.fill();
    ctx.stroke();

    ctx.drawImage(
      qrImage,
      1135,
      235,
      630,
      630
    );

    setFont(ctx, 800, 34);
    ctx.fillStyle = '#111111';
    ctx.fillText(
      t(
        'owner.bookOnline',
        'Запишитесь онлайн'
      ),
      1450,
      950
    );

    setFont(ctx, 700, 20);
    ctx.fillStyle = '#9a9fa7';
    ctx.fillText(
      'POWERED BY BOOKLY',
      1450,
      1010
    );
  };

  const drawPoster = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    qrImage: HTMLImageElement
  ) => {
    canvas.width = 1600;
    canvas.height = 2200;

    ctx.fillStyle = theme.bg;
    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.textAlign = 'center';

    setFont(ctx, 900, 42);
    ctx.fillStyle = theme.fg;
    ctx.fillText(
      'BOOKLY',
      800,
      150
    );

    drawFittedText(
      ctx,
      t(
        'owner.bookWithoutCalls',
        'Запишитесь без звонков'
      ),
      800,
      320,
      1320,
      88,
      54,
      900,
      theme.fg
    );

    setFont(ctx, 500, 34);
    ctx.fillStyle = theme.muted;
    ctx.fillText(
      t(
        'owner.chooseServiceTime',
        'Выберите услугу, специалиста и время'
      ),
      800,
      395
    );

    drawQrCard(
      ctx,
      qrImage,
      170,
      520,
      1260,
      115,
      55
    );

    drawFittedText(
      ctx,
      businessName,
      800,
      1935,
      1280,
      64,
      40,
      800,
      theme.fg
    );

    setFont(ctx, 600, 30);
    ctx.fillStyle = theme.muted;
    ctx.fillText(
      t(
        'owner.scanToBook',
        'Сканируйте для записи'
      ),
      800,
      2005
    );

    setFont(ctx, 700, 22);
    ctx.fillStyle = theme.muted;
    ctx.fillText(
      'POWERED BY BOOKLY',
      800,
      2110
    );
  };

  const buildTemplateCanvas =
  async (): Promise<HTMLCanvasElement> => {
    const canvas =
      document.createElement('canvas');

    const ctx =
      canvas.getContext('2d');

    if (!ctx) {
      throw new Error(
        'Canvas context is unavailable'
      );
    }

    ctx.direction =
      document.documentElement.dir === 'rtl'
        ? 'rtl'
        : 'ltr';

    const qrImage =
      await loadQrImage();

    if (template === 'minimal') {
      drawMinimal(
        canvas,
        ctx,
        qrImage
      );
    } else if (template === 'counter') {
      drawCounter(
        canvas,
        ctx,
        qrImage
      );
    } else if (template === 'poster') {
      drawPoster(
        canvas,
        ctx,
        qrImage
      );
    } else {
      drawClassic(
        canvas,
        ctx,
        qrImage
      );
    }

    return canvas;
  };
  const buildOutputCanvas =
  async (): Promise<HTMLCanvasElement> => {
    const source =
      await buildTemplateCanvas();

    const target =
      document.createElement('canvas');

    target.width =
      selectedPrintSize.width;

    target.height =
      selectedPrintSize.height;

    const ctx =
      target.getContext('2d');

    if (!ctx) {
      throw new Error(
        'Output canvas context is unavailable'
      );
    }

    ctx.fillStyle = theme.bg;

    ctx.fillRect(
      0,
      0,
      target.width,
      target.height
    );

    const margin =
      Math.round(
        Math.min(
          target.width,
          target.height
        ) * 0.035
      );

    const availableWidth =
      target.width - margin * 2;

    const availableHeight =
      target.height - margin * 2;

    const scale =
      Math.min(
        availableWidth /
          source.width,
        availableHeight /
          source.height
      );

    const drawWidth =
      source.width * scale;

    const drawHeight =
      source.height * scale;

    const x =
      (target.width -
        drawWidth) / 2;

    const y =
      (target.height -
        drawHeight) / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      source,
      x,
      y,
      drawWidth,
      drawHeight
    );

    return target;
  };
const downloadPrintableQr =
  async () => {
    try {
      const canvas =
        await buildOutputCanvas();

      const blob =
        await new Promise<Blob>(
          (resolve, reject) => {
            canvas.toBlob(
              value => {
                if (value) {
                  resolve(value);
                } else {
                  reject(
                    new Error(
                      'Failed to create printable QR image'
                    )
                  );
                }
              },
              'image/png',
              1
            );
          }
        );

      const fileName =
        `${business?.slug || 'bookly'}-qr-${template}-${colorTheme}-${printSize}.png`;

      const file =
        new File(
          [blob],
          fileName,
          {
            type: 'image/png'
          }
        );

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({
          files: [file]
        })
      ) {
        await navigator.share({
          files: [file],
          title: t(
            'owner.printQrTitle',
            'Bookly — QR для печати'
          )
        });

        return;
      }

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      link.href = url;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.setTimeout(
        () => {
          URL.revokeObjectURL(url);
        },
        1000
      );
    } catch (error) {
      console.error(
        'QR PRINT DOWNLOAD ERROR:',
        error
      );

      alert(
        t(
          'owner.qrPrintError',
          'Не удалось скачать макет'
        )
      );
    }
  };
  const downloadPrintablePdf =
    async () => {
      try {
        const canvas =
          await buildOutputCanvas();

        const jpegBlob =
          await new Promise<Blob>(
            (resolve, reject) => {
              canvas.toBlob(
                value => {
                  if (value) {
                    resolve(value);
                  } else {
                    reject(
                      new Error(
                        'Failed to create PDF image'
                      )
                    );
                  }
                },
                'image/jpeg',
                0.98
              );
            }
          );

        const jpegBytes =
          new Uint8Array(
            await jpegBlob.arrayBuffer()
          );

        const blob =
          createSinglePagePdf({
            jpegBytes,
            imageWidth: canvas.width,
            imageHeight: canvas.height,
            pageWidthMm:
              selectedPrintSize.pdfWidthMm,
            pageHeightMm:
              selectedPrintSize.pdfHeightMm
          });

        const fileName =
          `${business?.slug || 'bookly'}-qr-${template}-${colorTheme}-${printSize}.pdf`;

        const file =
          new File(
            [blob],
            fileName,
            {
              type: 'application/pdf'
            }
          );

        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare({
            files: [file]
          })
        ) {
          await navigator.share({
            files: [file],
            title: t(
              'owner.printQrTitle',
              'Bookly — QR для печати'
            )
          });

          return;
        }

        const url =
          URL.createObjectURL(blob);

        const link =
          document.createElement('a');

        link.href = url;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.setTimeout(
          () => {
            URL.revokeObjectURL(url);
          },
          1000
        );
      } catch (error) {
        console.error(
          'QR PRINT PDF ERROR:',
          error
        );

        alert(
          t(
            'owner.qrPrintError',
            'Не удалось скачать макет'
          )
        );
      }
    };

  return (
    <div
      className="qr-print-overlay"
      onClick={onClose}
    >
      <div
        className="qr-print-modal qr-template-modal"
        onClick={e =>
          e.stopPropagation()
        }
      >
        <button
          type="button"
          className="subscription-modal-close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="qr-template-head">
          <span>
            {t(
              'owner.printLayout',
              'Макет для печати'
            )}
          </span>

          <h2>
            {t(
              'owner.chooseQrTemplate',
              'Выберите макет'
            )}
          </h2>
        </div>

        <div className="qr-template-picker">
          {templateOptions.map(option => (
            <button
              type="button"
              key={option.id}
              className={
                template === option.id
                  ? 'qr-template-option active'
                  : 'qr-template-option'
              }
              onClick={() =>
                setTemplate(option.id)
              }
            >
              <span
                className={
                  `qr-template-mini qr-template-mini-${option.id}`
                }
              >
                <i />
                <b />
              </span>

              <strong>
                {option.label}
              </strong>

              <small>
                {option.hint}
              </small>
            </button>
          ))}
        </div>

        <div className="qr-color-section">
          <span className="qr-color-label">
            {t(
              'owner.chooseQrColor',
              'Цвет макета'
            )}
          </span>

          <div className="qr-color-picker">
            {colorThemes.map(item => (
              <button
                type="button"
                key={item.id}
                className={
                  colorTheme === item.id
                    ? 'qr-color-option active'
                    : 'qr-color-option'
                }
                onClick={() =>
                  setColorTheme(item.id)
                }
                aria-label={item.label}
                title={item.label}
              >
                <span
                  className="qr-color-swatch"
                  style={{
                    background: item.bg,
                    borderColor: item.border
                  }}
                />
                <small>{item.label}</small>
              </button>
            ))}
          </div>
        </div>
        
<div className="qr-size-section">
  <span className="qr-size-label">
    {t(
      'owner.chooseQrSize',
      'Размер макета'
    )}
  </span>

  <div className="qr-size-picker">
    {printSizes.map(item => (
      <button
        type="button"
        key={item.id}
        className={
          printSize === item.id
            ? 'qr-size-option active'
            : 'qr-size-option'
        }
        onClick={() =>
          setPrintSize(item.id)
        }
      >
        <span
          className={
            `qr-size-icon qr-size-icon-${item.id}`
          }
        />

        <strong>
          {item.label}
        </strong>

        <small>
          {item.hint}
        </small>
      </button>
    ))}
  </div>
</div>
        <div
          className={
            `qr-print-sheet qr-print-sheet-${template} qr-color-preview qr-size-preview qr-size-${printSize}`
          }
          style={previewStyle}
        >
          {template === 'poster' ? (
            <>
              <div className="qr-print-brand">
                BOOKLY
              </div>

              <h3 className="qr-poster-title">
                {t(
                  'owner.bookWithoutCalls',
                  'Запишитесь без звонков'
                )}
              </h3>

              <p>
                {t(
                  'owner.chooseServiceTime',
                  'Выберите услугу, специалиста и время'
                )}
              </p>

              <div className="qr-print-code">
                <img
                  src={qrDataUrl}
                  alt={t(
                    'owner.qrBookingAlt',
                    'QR-код для записи'
                  )}
                />
              </div>

              <h2>{businessName}</h2>

              <span>
                {t(
                  'owner.scanToBook',
                  'Сканируйте для записи'
                )}
              </span>

              <small>
                powered by Bookly
              </small>
            </>
          ) : template === 'counter' ? (
            <div className="qr-counter-preview">
              <div className="qr-counter-copy">
                <div className="qr-print-brand">
                  BOOKLY
                </div>

                <h2>{businessName}</h2>

                <p>
                  {t(
                    'owner.onlineBooking247',
                    'Онлайн-запись 24/7'
                  )}
                </p>

                <h3>
                  {t(
                    'owner.scanToBook',
                    'Сканируйте для записи'
                  )}
                </h3>
              </div>

              <div className="qr-print-code">
                <img
                  src={qrDataUrl}
                  alt={t(
                    'owner.qrBookingAlt',
                    'QR-код для записи'
                  )}
                />
              </div>
            </div>
          ) : template === 'minimal' ? (
            <>
              <div className="qr-print-brand">
                BOOKLY
              </div>

              <h2>{businessName}</h2>

              <div className="qr-print-code">
                <img
                  src={qrDataUrl}
                  alt={t(
                    'owner.qrBookingAlt',
                    'QR-код для записи'
                  )}
                />
              </div>

              <h3>
                {t(
                  'owner.scanToBook',
                  'Сканируйте для записи'
                )}
              </h3>

              <span>
                {t(
                  'owner.onlineBooking247',
                  'Онлайн-запись 24/7'
                )}
              </span>

              <small>Bookly</small>
            </>
          ) : (
            <>
              <div className="qr-print-brand">
                BOOKLY
              </div>

              <h2>{businessName}</h2>

              <p>
                {t(
                  'owner.onlineBooking',
                  'Онлайн-запись'
                )}
              </p>

              <div className="qr-print-code">
                <img
                  src={qrDataUrl}
                  alt={t(
                    'owner.qrBookingAlt',
                    'QR-код для записи'
                  )}
                />
              </div>

              <h3>
                {t(
                  'owner.bookOnline',
                  'Запишитесь онлайн'
                )}
              </h3>

              <span>
                {t(
                  'owner.scanQr',
                  'Отсканируйте QR-код'
                )}{' '}
                {t(
                  'owner.phoneCamera',
                  'камерой телефона'
                )}
              </span>

              <small>
                powered by Bookly
              </small>
            </>
          )}
        </div>

<div className="qr-export-actions">
  <button
    type="button"
    className="primary full"
    onClick={downloadPrintableQr}
  >
    {t(
      'owner.downloadPng',
      'Скачать PNG'
    )}
  </button>

  <button
    type="button"
    className="qr-pdf-button full"
    onClick={downloadPrintablePdf}
  >
    {t(
      'owner.downloadPdf',
      'Скачать PDF'
    )}
  </button>
</div>
      </div>
    </div>
  );
}
