/** 상점 설정 공유 — 설계서 10-4 */
import { useRef, useState } from 'react';
import { applyShopSettings, encodeShopCode, exportShopSettings, type ImportPreview, parseShopSettings } from '../../domain/shareCode';
import { useGameStore } from '../../store/useGameStore';
import { dateStamp, downloadText } from './fields';

export function SharePanel() {
  const catalog = useGameStore((s) => s.catalog);
  const replaceCatalog = useGameStore((s) => s.replaceCatalog);
  const [code] = useState(() => encodeShopCode(exportShopSettings(catalog, Date.now())));
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const check = (text: string) => {
    const r = parseShopSettings(text, useGameStore.getState().catalog);
    if (!r.ok) {
      setPreview(null);
      setMessage({ kind: 'error', text: r.error });
      return;
    }
    setMessage(null);
    setPreview(r.preview);
  };

  return (
    <div className="admin-panel">
      <section className="admin-card">
        <h2 className="admin-heading">이 기기의 상점 설정 보내기</h2>
        <p className="admin-help">학생 기기에서 ‘불러오기’에 붙여 넣거나 파일을 열면 같은 상점이 돼요. 학습 기록·별·펫은 들어가지 않아요.</p>
        <textarea className="admin-input admin-code" readOnly value={code} rows={3} aria-label="상점 설정 코드" onFocus={(e) => e.target.select()} />
        <div className="admin-actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? '복사했어요 ✓' : '코드 복사'}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => downloadText(`shop-settings-${dateStamp(Date.now())}.json`, JSON.stringify(exportShopSettings(catalog, Date.now()), null, 1))}
          >
            파일로 저장
          </button>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-heading">상점 설정 불러오기</h2>
        <textarea
          className="admin-input admin-code"
          rows={3}
          placeholder="GUGU1-… 코드를 붙여 넣으세요"
          value={input}
          aria-label="불러올 코드"
          onChange={(e) => {
            setInput(e.target.value);
            setPreview(null);
            setMessage(null);
          }}
        />
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) check(await file.text());
            e.target.value = '';
          }}
        />
        <div className="admin-actions">
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            파일 열기
          </button>
          <button type="button" className="btn btn--primary" disabled={!input.trim()} onClick={() => check(input)}>
            확인
          </button>
        </div>

        {message && <p className={`admin-note admin-note--${message.kind === 'error' ? 'error' : 'ok'}`}>{message.text}</p>}
        {preview && (
          <div className="admin-note admin-note--ok">
            <strong>이렇게 바뀌어요</strong>
            <ul>
              {preview.added > 0 && <li>새 아이템 {preview.added}개</li>}
              {preview.priceChanged > 0 && <li>가격 변경 {preview.priceChanged}개</li>}
              {preview.saleChanged > 0 && <li>판매 상태 변경 {preview.saleChanged}개</li>}
              {preview.otherChanged > 0 && <li>이름·효과 등 변경 {preview.otherChanged}개</li>}
              {preview.added + preview.priceChanged + preview.saleChanged + preview.otherChanged === 0 && <li>지금과 똑같아요</li>}
              {preview.skipped.length > 0 && <li>건너뜀 (값이 올바르지 않음): {preview.skipped.join(', ')}</li>}
            </ul>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                replaceCatalog(applyShopSettings(useGameStore.getState().catalog, preview.valid));
                setPreview(null);
                setInput('');
                setMessage({ kind: 'ok', text: '상점 설정을 적용했어요.' });
              }}
            >
              적용하기
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
