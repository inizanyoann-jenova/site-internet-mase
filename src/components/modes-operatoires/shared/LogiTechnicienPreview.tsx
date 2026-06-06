import { useMemo } from 'react';
import type { PhaseStep } from '../../../types/modesOperatoires';
import { buildLogiTechnicienSVG } from '../../../engine/modesOperatoires/buildLogiTechnicienSVG';

interface Props {
  preparation: PhaseStep[];
  execution: PhaseStep[];
  finTache: PhaseStep[];
  className?: string;
}

export default function LogiTechnicienPreview({ preparation, execution, finTache, className }: Props) {
  const svgString = useMemo(
    () => buildLogiTechnicienSVG(preparation, execution, finTache),
    [preparation, execution, finTache],
  );

  const isEmpty = preparation.length === 0 && execution.length === 0 && finTache.length === 0;

  if (isEmpty) {
    return (
      <div className={`flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 ${className ?? ''}`} style={{ minHeight: 160 }}>
        <div className="text-center text-gray-400 text-sm">
          <div className="text-2xl mb-1">📋</div>
          Ajoutez des étapes pour voir le logigramme
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-auto rounded-xl border border-gray-200 bg-white ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}
