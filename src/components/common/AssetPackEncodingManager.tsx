import React, { useCallback, useEffect, useState } from 'react';
import { findInvalidUtf8Files, fixFileEncoding } from '../../utils/utf8Validator';

interface Props {
  assetPackPath: string;
}

export const AssetPackEncodingManager: React.FC<Props> = ({ assetPackPath }) => {
  const [invalidFiles, setInvalidFiles] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanFiles = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      setInvalidFiles(await findInvalidUtf8Files(assetPackPath));
      setFixed(false);
      setHasScanned(true);
    } catch (err) {
      setError(`Failed to scan asset pack: ${err}`);
    } finally {
      setScanning(false);
    }
  }, [assetPackPath]);

  useEffect(() => {
    void scanFiles();
  }, [scanFiles]);

  const fixFiles = async () => {
    setFixing(true);
    setError(null);
    try {
      await Promise.all(invalidFiles.map(file => fixFileEncoding(file)));
      setFixed(true);
      await scanFiles();
    } catch (err) {
      setError(`Failed to rewrite files: ${err}`);
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="p-4 border rounded bg-white shadow">
      <h2 className="text-lg font-bold mb-2">Asset Pack Encoding Manager</h2>
      <button className="btn btn-primary mb-2" onClick={scanFiles} disabled={scanning || fixing}>
        {scanning ? "Scanning..." : "Rescan for Encoding Issues"}
      </button>
      {error ? <div className="text-red-600 mb-2">{error}</div> : null}
      {!hasScanned ? (
        <div className="text-slate-600">Scanning asset pack encoding...</div>
      ) : invalidFiles.length > 0 ? (
        <div>
          <div className="text-red-600 mb-2">Warning: {invalidFiles.length} file(s) have invalid UTF-8 encoding.</div>
          <div className="text-amber-700 mb-2">
            Rewriting is lossy: invalid byte sequences are replaced before the file is saved as UTF-8.
          </div>
          <ul className="mb-2">
            {invalidFiles.map(file => <li key={file}>{file}</li>)}
          </ul>
          <button className="btn btn-warning" onClick={fixFiles} disabled={fixing || scanning}>
            {fixing ? "Rewriting..." : "Rewrite as UTF-8 (lossy)"}
          </button>
        </div>
      ) : (
        <div className="text-green-600">All files are valid UTF-8.</div>
      )}
      {fixed && <div className="text-blue-600 mt-2">Encoding issues rewritten.</div>}
    </div>
  );
};
