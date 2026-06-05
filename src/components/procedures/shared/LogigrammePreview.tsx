import { useMemo, useState } from 'react';
import type { StepDefinition } from '../../../types/procedures';
import { buildLogiSVG, DEFAULT_LOGI_SIZES, type LogiSizes } from '../../../engine/procedures/buildLogiSVG';

interface Props {
  steps: StepDefinition[];
  isSwim: boolean;
  sizes?: LogiSizes;
  showSizeControls?: boolean;
}

export default function LogigrammePreview({ steps, isSwim, sizes: externalSizes, showSizeControls = false }: Props) {
  const [sizes, setSizes] = useState<LogiSizes>(externalSizes ?? DEFAULT_LOGI_SIZES);

  const { svgStr, legendHtml } = useMemo(
    () => buildLogiSVG(steps, isSwim, sizes),
    [steps, isSwim, sizes],
  );

  const handleDownloadSVG = () => {
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'logigramme.svg';
    a.click();
  };

  if (!svgStr) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
        Ajoutez des étapes pour voir le logigramme
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {showSizeControls && (
        <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <span className="font-bold">📐 Formes :</span>
          {(['boxW', 'boxH', 'dHW', 'dHH'] as const).map((key) => (
            <label key={key} className="flex items-center gap-1">
              {key} <input type="number" value={sizes[key]}
                onChange={(e) => setSizes((s) => ({ ...s, [key]: parseInt(e.target.value) || s[key] }))}
                className="w-14 rounded border border-gray-300 px-1 py-0.5 text-xs" min={20} max={600} step={4}
              />
            </label>
          ))}
          <button onClick={() => setSizes(DEFAULT_LOGI_SIZES)} className="text-gray-400 hover:text-gray-600">↺</button>
          <button onClick={handleDownloadSVG} className="ml-auto rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium hover:border-blue-300 hover:text-blue-600">⬇ SVG</button>
        </div>
      )}
      <div
        dangerouslySetInnerHTML={{ __html: svgStr }}
        className="w-full overflow-x-auto"
      />
      {legendHtml && (
        <div
          className="flex flex-wrap justify-center gap-3"
          dangerouslySetInnerHTML={{ __html: legendHtml }}
        />
      )}
    </div>
  );
}
