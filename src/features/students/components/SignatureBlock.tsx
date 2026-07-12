/**
 * The signature footer shared by every official printed document
 * (transfer letter/certificate, transcript, report card): the uploaded
 * Head Teacher / Deputy signature image (School Profile → Branding)
 * above the signature line, with the issue date on the right. Without
 * an upload it stays a blank line for a wet-ink signature.
 */
export default function SignatureBlock({
  signatureUrl,
  issued,
}: {
  signatureUrl?: string;
  issued: string;
}) {
  return (
    <div className="mt-10 flex items-end justify-between">
      <div>
        {signatureUrl && (
          <img
            src={signatureUrl}
            alt="Head Teacher signature"
            className="h-12 max-w-48 object-contain"
          />
        )}
        <div className={`${signatureUrl ? "" : "h-10 "}w-48 border-b border-gray-400`} />
        <p className="mt-1 text-sm">Head Teacher signature &amp; stamp</p>
      </div>
      <p className="text-sm text-gray-600">Issued: {issued}</p>
    </div>
  );
}
