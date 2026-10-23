import useAdminTranslation from '../hooks/useAdminTranslation'
import BarcodePrintButton from './BarcodePrintButton'
import { encodeCode128B } from '../utils/code128'
import './barcodePrint.css'

function BarcodePreview({ value, productName, produkId, stok, canPrint = false }) {
  const { t } = useAdminTranslation()

  const encoded = encodeCode128B(value)

  return (
    <div className="kuki-barcode-preview" aria-label={t("Pratinjau barcode produk")}>
      <strong className="kuki-barcode-preview-title">{t("Pratinjau Barcode — Code 128")}</strong>

      {encoded.error ? (
        <p className="kuki-barcode-help" role="status">{encoded.error}</p>
      ) : (
        <>
          <div className="kuki-barcode-printable">
            <div className="kuki-barcode-product-name">{productName?.trim() || t("Produk Kuki Bakehouse")}</div>
            <svg
              role="img"
              aria-label={`Barcode Code 128 untuk ${encoded.text}`}
              viewBox={`0 0 ${encoded.width} 86`}
              preserveAspectRatio="xMidYMid meet"
            >
              <rect width={encoded.width} height="86" fill="#ffffff" />
              {encoded.bars.map((bar, index) => (
                <rect key={index} x={bar.x} y="5" width={bar.width} height="53" fill="#111111" />
              ))}
              <text
                x={encoded.width / 2}
                y="75"
                fontFamily="monospace"
                fontSize="11"
                textAnchor="middle"
                fill="#111111"
              >
                {encoded.text}
              </text>
            </svg>
          </div>

          <div className="kuki-barcode-preview-actions">
            <span className="kuki-barcode-help">
              {canPrint
                ?t("Kode telah tersimpan. Siap dicetak sebagai label.")
                :t("Simpan produk atau perubahan barcode terlebih dahulu sebelum mencetak.")}
            </span>
            <BarcodePrintButton
              value={value}
              productName={productName}
              produkId={produkId}
              stok={stok}
              disabled={!canPrint}
            />
          </div>
        </>
      )}
    </div>
  )
}

export default BarcodePreview
