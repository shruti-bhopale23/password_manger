import { useState } from 'react';
import './App.css';

function generateSecurePassword({
  length = 16,
  upper = true,
  lower = true,
  numbers = true,
  symbols = true,
} = {}) {
  const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const LOWER = 'abcdefghijklmnopqrstuvwxyz';
  const NUMBERS = '0123456789';
  const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const sets = [];
  if (upper) sets.push(UPPER);
  if (lower) sets.push(LOWER);
  if (numbers) sets.push(NUMBERS);
  if (symbols) sets.push(SYMBOLS);

  if (sets.length === 0) {
    sets.push(LOWER);
  }

  const cryptoObj =
    (typeof window !== 'undefined' && window.crypto) ||
    (typeof globalThis !== 'undefined' && globalThis.crypto);

  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues is not available');
  }

  const getRandomInt = (max) => {
    const limit = 4294967296 - (4294967296 % max);
    const buf = new Uint32Array(1);
    while (true) {
      cryptoObj.getRandomValues(buf);
      if (buf[0] < limit) {
        return buf[0] % max;
      }
    }
  };

  const parsedLen = parseInt(length, 10);
  const targetLen = isNaN(parsedLen) ? 16 : Math.max(8, Math.min(32, parsedLen));
  const chars = [];

  // Guarantee at least one character from each selected set
  for (let i = 0; i < sets.length && chars.length < targetLen; i++) {
    const currentSet = sets[i];
    chars.push(currentSet[getRandomInt(currentSet.length)]);
  }

  // Combined pool for remaining characters
  const allPool = sets.join('');
  while (chars.length < targetLen) {
    chars.push(allPool[getRandomInt(allPool.length)]);
  }

  // Cryptographic Fisher-Yates shuffle using crypto.getRandomValues
  for (let i = chars.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join('');
}

export function PasswordForm({
  onAddPassword,
  onUpdatePassword,
  editingPassword = null,
  onCancelEdit,
  setPasswords,
}) {
  const [site, setSite] = useState(editingPassword ? editingPassword.site : '');
  const [user, setUser] = useState(editingPassword ? editingPassword.user : '');
  const [pass, setPass] = useState(editingPassword ? editingPassword.pass : '');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [prevEditingPassword, setPrevEditingPassword] = useState(editingPassword);

  // Generator state (useState only)
  const [genLength, setGenLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);

  // Adjust form state during render if editingPassword changes
  if (editingPassword !== prevEditingPassword) {
    setPrevEditingPassword(editingPassword);
    setSite(editingPassword ? editingPassword.site : '');
    setUser(editingPassword ? editingPassword.user : '');
    setPass(editingPassword ? editingPassword.pass : '');
    setShowPassword(false);
    setErrors({});
  }

  const handleSiteChange = (e) => {
    setSite(e.target.value);
    if (errors.site) {
      setErrors((prev) => ({ ...prev, site: '' }));
    }
  };

  const handleUserChange = (e) => {
    setUser(e.target.value);
    if (errors.user) {
      setErrors((prev) => ({ ...prev, user: '' }));
    }
  };

  const handlePassChange = (e) => {
    setPass(e.target.value);
    if (errors.pass) {
      setErrors((prev) => ({ ...prev, pass: '' }));
    }
  };

  const handleToggleOption = (type) => {
    const current = {
      upper: useUpper,
      lower: useLower,
      numbers: useNumbers,
      symbols: useSymbols,
    };

    if (current[type]) {
      const activeCount = Object.values(current).filter(Boolean).length;
      if (activeCount <= 1) {
        // At least one must stay checked
        return;
      }
    }

    if (type === 'upper') setUseUpper((prev) => !prev);
    if (type === 'lower') setUseLower((prev) => !prev);
    if (type === 'numbers') setUseNumbers((prev) => !prev);
    if (type === 'symbols') setUseSymbols((prev) => !prev);
  };

  const handleLengthChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setGenLength('');
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      setGenLength(num);
    }
  };

  const handleLengthBlur = () => {
    const num = parseInt(genLength, 10);
    if (isNaN(num) || num < 8) {
      setGenLength(8);
    } else if (num > 32) {
      setGenLength(32);
    }
  };

  const handleGenerate = () => {
    const newPassword = generateSecurePassword({
      length: genLength,
      upper: useUpper,
      lower: useLower,
      numbers: useNumbers,
      symbols: useSymbols,
    });
    setPass(newPassword);
    if (errors.pass) {
      setErrors((prev) => ({ ...prev, pass: '' }));
    }
  };

  const handleCancel = () => {
    setSite('');
    setUser('');
    setPass('');
    setShowPassword(false);
    setErrors({});

    if (typeof onCancelEdit === 'function') {
      onCancelEdit();
    }

    const firstField = document.getElementById('website') || document.querySelector('input[name="website"]');
    firstField?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!site.trim()) {
      newErrors.site = 'Website is required';
    }
    if (!user.trim()) {
      newErrors.user = 'Username or email is required';
    }
    if (!pass.trim()) {
      newErrors.pass = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (editingPassword) {
      const updatedEntry = {
        id: editingPassword.id, // keep the original id
        site: site.trim(),
        user: user.trim(),
        pass: pass,
      };

      if (typeof onUpdatePassword === 'function') {
        onUpdatePassword(updatedEntry);
      } else if (typeof setPasswords === 'function') {
        setPasswords((prev) =>
          prev.map((item) => (item.id === updatedEntry.id ? updatedEntry : item))
        );
      }

      if (typeof onCancelEdit === 'function') {
        onCancelEdit();
      }
    } else {
      const newEntry = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString() + '-' + (typeof crypto !== 'undefined' && crypto.getRandomValues
              ? Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, '0')).join('')
              : Date.now().toString()),
        site: site.trim(),
        user: user.trim(),
        pass: pass,
      };

      if (typeof onAddPassword === 'function') {
        onAddPassword(newEntry);
      } else if (typeof setPasswords === 'function') {
        setPasswords((prev) => [...prev, newEntry]);
      }
    }

    // Reset the form
    setSite('');
    setUser('');
    setPass('');
    setShowPassword(false);
    setErrors({});

    // Focus the first field
    const firstField = document.getElementById('website') || document.querySelector('input[name="website"]');
    firstField?.focus();
  };

  return (
    <form className="password-form" onSubmit={handleSubmit} noValidate>
      <div className="form-header-row">
        <h2 className="form-title">
          {editingPassword ? 'Edit Password' : 'Add New Password'}
        </h2>
        {editingPassword && (
          <span className="editing-badge">Editing Mode</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="website" className="form-label">
          Website <span className="required-star">*</span>
        </label>
        <input
          id="website"
          name="website"
          type="text"
          placeholder="e.g. github.com"
          value={site}
          onChange={handleSiteChange}
          className={`form-input ${errors.site ? 'input-error' : ''}`}
          autoComplete="url"
        />
        {errors.site && (
          <span className="error-text" role="alert">
            {errors.site}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="username" className="form-label">
          Username / Email <span className="required-star">*</span>
        </label>
        <input
          id="username"
          name="username"
          type="text"
          placeholder="e.g. alex@example.com"
          value={user}
          onChange={handleUserChange}
          className={`form-input ${errors.user ? 'input-error' : ''}`}
          autoComplete="username"
        />
        {errors.user && (
          <span className="error-text" role="alert">
            {errors.user}
          </span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">
          Password <span className="required-star">*</span>
        </label>
        <div className="password-input-row">
          <div className="password-input-wrapper">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={pass}
              onChange={handlePassChange}
              className={`form-input password-input ${errors.pass ? 'input-error' : ''}`}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <button
            type="button"
            className="generate-btn"
            onClick={handleGenerate}
            aria-label="Generate"
          >
            Generate
          </button>
        </div>
        {errors.pass && (
          <span className="error-text" role="alert">
            {errors.pass}
          </span>
        )}

        <div className="generator-options" aria-label="Password generator settings">
          <div className="generator-length-group">
            <label htmlFor="generator-length" className="generator-length-label">
              Length: <span className="length-display">{genLength || 16}</span>
            </label>
            <input
              id="generator-length"
              name="length"
              type="number"
              min={8}
              max={32}
              value={genLength}
              onChange={handleLengthChange}
              onBlur={handleLengthBlur}
              className="form-input generator-length-input"
            />
          </div>

          <div className="generator-checkboxes-group" role="group" aria-label="Character types">
            <label htmlFor="gen-uppercase" className="generator-checkbox-label">
              <input
                id="gen-uppercase"
                name="uppercase"
                type="checkbox"
                checked={useUpper}
                onChange={() => handleToggleOption('upper')}
                className="generator-checkbox"
              />
              <span>Uppercase</span>
            </label>

            <label htmlFor="gen-lowercase" className="generator-checkbox-label">
              <input
                id="gen-lowercase"
                name="lowercase"
                type="checkbox"
                checked={useLower}
                onChange={() => handleToggleOption('lower')}
                className="generator-checkbox"
              />
              <span>Lowercase</span>
            </label>

            <label htmlFor="gen-numbers" className="generator-checkbox-label">
              <input
                id="gen-numbers"
                name="numbers"
                type="checkbox"
                checked={useNumbers}
                onChange={() => handleToggleOption('numbers')}
                className="generator-checkbox"
              />
              <span>Numbers</span>
            </label>

            <label htmlFor="gen-symbols" className="generator-checkbox-label">
              <input
                id="gen-symbols"
                name="symbols"
                type="checkbox"
                checked={useSymbols}
                onChange={() => handleToggleOption('symbols')}
                className="generator-checkbox"
              />
              <span>Symbols</span>
            </label>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="submit-btn primary-btn">
          {editingPassword ? 'Update password' : 'Add password'}
        </button>
        {editingPassword && (
          <button
            type="button"
            className="cancel-btn secondary-btn"
            onClick={handleCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function PasswordList({
  passwords = [],
  onEdit,
  onDelete,
  editingId = null,
  searchTerm: controlledSearchTerm,
  onSearchChange: controlledOnSearchChange,
  isSearching: controlledIsSearching,
  emptyTitle,
  emptySubtitle,
}) {
  const [internalSearch, setInternalSearch] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedIds, setCopiedIds] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const isControlled = controlledSearchTerm !== undefined;
  const searchTerm = isControlled ? controlledSearchTerm : internalSearch;

  const handleSearchChange = (e) => {
    if (isControlled) {
      if (typeof controlledOnSearchChange === 'function') {
        controlledOnSearchChange(e.target.value);
      }
    } else {
      setInternalSearch(e.target.value);
    }
  };

  const query = (searchTerm || '').trim().toLowerCase();
  const isSearching = isControlled
    ? Boolean(controlledIsSearching || query)
    : Boolean(query);

  const displayedPasswords = query
    ? passwords.filter((item) => {
        const siteMatch = item?.site ? item.site.toLowerCase().includes(query) : false;
        const userMatch = item?.user ? item.user.toLowerCase().includes(query) : false;
        return siteMatch || userMatch;
      })
    : passwords;

  const handleToggleVisibility = (id) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopyPassword = async (id, password) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(password);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = password;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!successful) {
          throw new Error('Clipboard copy failed');
        }
      }

      const copyToken = Date.now();
      setCopiedIds((prev) => ({ ...prev, [id]: copyToken }));
      setTimeout(() => {
        setCopiedIds((prev) => {
          if (prev[id] === copyToken) {
            const next = { ...prev };
            delete next[id];
            return next;
          }
          return prev;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  return (
    <section className="password-list-section" aria-labelledby="saved-passwords-heading">
      <div className="list-header">
        <h2 id="saved-passwords-heading" className="list-title">
          Saved Passwords
        </h2>
        <span className="count-badge" aria-label={`${displayedPasswords.length} passwords saved`}>
          {displayedPasswords.length}
        </span>
      </div>

      {!isControlled && (
        <div className="search-section standalone-search" role="search">
          <label htmlFor="standalone-search-input" className="search-label sr-only">
            Search passwords
          </label>
          <div className="search-input-wrapper">
            <span className="search-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              id="standalone-search-input"
              name="search"
              type="text"
              placeholder="Search by site or username"
              value={internalSearch}
              onChange={handleSearchChange}
              className="form-input search-input"
              aria-label="Search by site or username"
              autoComplete="off"
            />
            {internalSearch && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setInternalSearch('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {displayedPasswords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            {isSearching ? (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            ) : (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            )}
          </div>
          <p className="empty-title">
            {emptyTitle || (isSearching ? 'No matches found' : 'No passwords saved yet')}
          </p>
          <p className="empty-subtitle">
            {emptySubtitle !== undefined
              ? emptySubtitle
              : isSearching
              ? 'No credentials matched your search query.'
              : 'Fill out the form above to add your first credential.'}
          </p>
        </div>
      ) : (
        <ul className="password-list" aria-label="Saved passwords list">
          {displayedPasswords.map((item) => {
            const isVisible = Boolean(visiblePasswords[item.id]);
            const isCopied = Boolean(copiedIds[item.id]);

            return (
              <li
                key={item.id}
                className={`password-card ${editingId === item.id ? 'is-editing' : ''}`}
              >
                <div className="card-details">
                  <div className="card-site-row">
                    <span className="card-site-icon" aria-hidden="true">🌐</span>
                    <span className="card-site-name">{item.site}</span>
                  </div>
                  <div className="card-user-row">
                    <span className="card-user-label">Username / Email:</span>
                    <span className="card-user-name">{item.user}</span>
                  </div>
                  <div className="card-password-row">
                    <span className="card-password-label">Password:</span>
                    <span className="card-password-value card-password">
                      {isVisible ? item.pass : '••••••••'}
                    </span>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    type="button"
                    className="action-btn toggle-btn show-hide-btn secondary-btn"
                    onClick={() => handleToggleVisibility(item.id)}
                    aria-label={isVisible ? `Hide password for ${item.site}` : `Show password for ${item.site}`}
                  >
                    {isVisible ? 'Hide' : 'Show'}
                  </button>
                  <button
                    type="button"
                    className={`action-btn copy-btn secondary-btn ${isCopied ? 'copied is-copied' : ''}`}
                    onClick={() => handleCopyPassword(item.id, item.pass || '')}
                    aria-label={`Copy password for ${item.site}`}
                  >
                    {isCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    className="action-btn edit-btn secondary-btn"
                    onClick={() => {
                      setConfirmDeleteId(null);
                      if (onEdit) onEdit(item);
                    }}
                    aria-label={`Edit password for ${item.site}`}
                  >
                    Edit
                  </button>
                  {confirmDeleteId === item.id ? (
                    <div className="delete-confirm-group" role="group" aria-label="Confirm deletion">
                      <span className="delete-confirm-text">Delete?</span>
                      <button
                        type="button"
                        className="action-btn delete-confirm-yes danger-btn"
                        onClick={() => {
                          setConfirmDeleteId(null);
                          if (onDelete) onDelete(item.id);
                        }}
                        aria-label={`Confirm delete password for ${item.site}`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className="action-btn delete-confirm-no secondary-btn"
                        onClick={() => setConfirmDeleteId(null)}
                        aria-label={`Cancel delete password for ${item.site}`}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="action-btn delete-btn danger-btn"
                      onClick={() => setConfirmDeleteId(item.id)}
                      aria-label={`Delete password for ${item.site}`}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function getCrypto() {
  const cryptoObj =
    (typeof window !== 'undefined' && window.crypto) ||
    (typeof globalThis !== 'undefined' && globalThis.crypto);

  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API is not available');
  }

  return cryptoObj;
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + chunkSize, len))
    );
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getOrCreateKdfSalt() {
  const stored = localStorage.getItem('kdfSalt');
  if (stored) {
    if (/^[0-9a-fA-F]{32,}$/.test(stored)) {
      const bytes = new Uint8Array(stored.length / 2);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(stored.substr(i * 2, 2), 16);
      }
      return bytes;
    }
    try {
      const decoded = base64ToBuffer(stored);
      if (decoded && decoded.length > 0) {
        return decoded;
      }
    } catch {
      // regenerate if invalid
    }
  }

  const cryptoObj = getCrypto();
  const newSalt = new Uint8Array(16);
  cryptoObj.getRandomValues(newSalt);
  localStorage.setItem('kdfSalt', bufferToBase64(newSalt));
  return newSalt;
}

async function deriveKeyFromPassword(masterPassword) {
  const cryptoObj = getCrypto();
  const salt = getOrCreateKdfSalt();

  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 310000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function saveVault(key, passwordsArray) {
  const cryptoObj = getCrypto();
  const iv = new Uint8Array(12);
  cryptoObj.getRandomValues(iv);

  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(passwordsArray));
  const ciphertextBuffer = await cryptoObj.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  const vaultPayload = {
    iv: bufferToBase64(iv),
    data: bufferToBase64(ciphertextBuffer),
  };

  localStorage.setItem('vault', JSON.stringify(vaultPayload));
}

async function loadVault(key, vaultRaw) {
  if (!vaultRaw) {
    return [];
  }

  const parsed = JSON.parse(vaultRaw);
  if (!parsed || typeof parsed !== 'object' || !parsed.iv || !parsed.data) {
    throw new Error('Invalid vault structure: missing iv or data');
  }

  const cryptoObj = getCrypto();
  const iv = base64ToBuffer(parsed.iv);
  const data = base64ToBuffer(parsed.data);

  const decryptedBuffer = await cryptoObj.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  const decoder = new TextDecoder();
  const decryptedText = decoder.decode(decryptedBuffer);
  const passwords = JSON.parse(decryptedText);

  if (!Array.isArray(passwords)) {
    throw new Error('Vault content is not an array');
  }

  return passwords;
}

export function MasterPasswordLock({
  onUnlock,
  setUnlocked,
  isConfigured,
}) {
  const checkHasAuth = () => {
    if (typeof isConfigured === 'boolean') {
      return isConfigured;
    }
    try {
      const stored = localStorage.getItem('masterAuth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.salt && parsed.hash) {
          return true;
        }
      }
    } catch {
      // ignore
    }
    try {
      if (localStorage.getItem('kdfSalt') || localStorage.getItem('vault')) {
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  const [hasAuth, setHasAuth] = useState(checkHasAuth);
  const [prevIsConfigured, setPrevIsConfigured] = useState(isConfigured);

  if (isConfigured !== prevIsConfigured) {
    setPrevIsConfigured(isConfigured);
    if (typeof isConfigured === 'boolean') {
      setHasAuth(isConfigured);
    }
  }

  // Create Master Password fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Unlock field
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);

  // Errors and submitting state
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const triggerUnlock = async (derivedKey) => {
    if (typeof onUnlock === 'function') {
      await onUnlock(derivedKey);
    } else if (typeof setUnlocked === 'function') {
      setUnlocked(true);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const cryptoObj = getCrypto();

      const saltBytes = new Uint8Array(16);
      cryptoObj.getRandomValues(saltBytes);
      const salt = Array.from(saltBytes, (b) => b.toString(16).padStart(2, '0')).join('');

      const encoder = new TextEncoder();
      const data = encoder.encode(salt + password);
      const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
      const hash = Array.from(new Uint8Array(hashBuffer), (b) =>
        b.toString(16).padStart(2, '0')
      ).join('');

      // Store only { salt, hash } under "masterAuth"
      localStorage.setItem('masterAuth', JSON.stringify({ salt, hash }));

      // Derive AES-GCM 256 key from master password with PBKDF2 (SHA-256, 310000 iterations, separate random salt stored as "kdfSalt" in localStorage)
      const derivedKey = await deriveKeyFromPassword(password);

      setHasAuth(true);
      setPassword('');
      setConfirmPassword('');
      setError('');
      await triggerUnlock(derivedKey);
    } catch (err) {
      console.error('Failed to create master password:', err);
      setError(err?.message || 'Failed to create master password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!unlockPassword) {
      setError('Wrong password');
      return;
    }

    setIsSubmitting(true);
    try {
      let storedAuth = null;
      try {
        storedAuth = JSON.parse(localStorage.getItem('masterAuth'));
      } catch {
        storedAuth = null;
      }

      const cryptoObj = getCrypto();

      if (storedAuth && storedAuth.salt && storedAuth.hash) {
        const encoder = new TextEncoder();
        const saltStr =
          typeof storedAuth.salt === 'string'
            ? storedAuth.salt
            : Array.from(new Uint8Array(storedAuth.salt), (b) =>
                b.toString(16).padStart(2, '0')
              ).join('');
        const data = encoder.encode(saltStr + unlockPassword);
        const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
        const computedHash = Array.from(new Uint8Array(hashBuffer), (b) =>
          b.toString(16).padStart(2, '0')
        ).join('');

        if (computedHash.toLowerCase() !== String(storedAuth.hash).toLowerCase()) {
          setError('Wrong password');
          setIsSubmitting(false);
          return;
        }
      }

      // Derive AES-GCM 256 key from master password with PBKDF2
      const derivedKey = await deriveKeyFromPassword(unlockPassword);

      setUnlockPassword('');
      setError('');
      await triggerUnlock(derivedKey);
    } catch (err) {
      console.error('Failed to unlock master password:', err);
      setError(err?.message || 'Wrong password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasAuth) {
    return (
      <form
        className="password-form lock-card"
        onSubmit={handleCreateSubmit}
        noValidate
        aria-label="Create master password form"
      >
        <div className="lock-header">
          <div className="lock-icon-badge" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 className="form-title lock-title">Create master password</h2>
          <p className="lock-subtitle">
            Set a master password to protect your vault (minimum 8 characters).
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="master-password" className="form-label">
            Password <span className="required-star">*</span>
          </label>
          <div className="password-input-wrapper">
            <input
              id="master-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter master password (min 8 chars)"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              className={`form-input password-input ${
                error && (!password || password.length < 8 || password !== confirmPassword)
                  ? 'input-error'
                  : ''
              }`}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirm-password" className="form-label">
            Confirm Password <span className="required-star">*</span>
          </label>
          <div className="password-input-wrapper">
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm master password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError('');
              }}
              className={`form-input password-input ${
                error && password !== confirmPassword ? 'input-error' : ''
              }`}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="toggle-password-btn"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {error && (
          <span className="error-text lock-error" role="alert">
            {error}
          </span>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="submit-btn lock-submit-btn"
            disabled={isSubmitting}
          >
            Create master password
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      className="password-form lock-card"
      onSubmit={handleUnlockSubmit}
      noValidate
      aria-label="Unlock password manager form"
    >
      <div className="lock-header">
        <div className="lock-icon-badge" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <h2 className="form-title lock-title">Unlock</h2>
        <p className="lock-subtitle">
          Enter your master password to access your saved passwords.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="unlock-password" className="form-label">
          Master Password <span className="required-star">*</span>
        </label>
        <div className="password-input-wrapper">
          <input
            id="unlock-password"
            name="password"
            type={showUnlockPassword ? 'text' : 'password'}
            placeholder="Enter master password"
            value={unlockPassword}
            onChange={(e) => {
              setUnlockPassword(e.target.value);
              if (error) setError('');
            }}
            className={`form-input password-input ${error ? 'input-error' : ''}`}
            autoComplete="current-password"
            autoFocus
          />
          <button
            type="button"
            className="toggle-password-btn"
            onClick={() => setShowUnlockPassword((prev) => !prev)}
            aria-label={showUnlockPassword ? 'Hide master password' : 'Show master password'}
          >
            {showUnlockPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {error && (
        <span className="error-text lock-error" role="alert">
          {error}
        </span>
      )}

      <div className="form-actions">
        <button
          type="submit"
          className="submit-btn lock-submit-btn"
          disabled={isSubmitting}
        >
          Unlock
        </button>
      </div>
    </form>
  );
}

export { MasterPasswordLock as LockScreen, MasterPasswordLock as MasterLock };

export default function App({ initialUnlocked = false }) {
  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [cryptoKey, setCryptoKey] = useState(null);
  const [passwords, setPasswords] = useState([]);
  const [editingPassword, setEditingPassword] = useState(null);
  const [vaultError, setVaultError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const query = searchQuery.trim().toLowerCase();
  const filteredPasswords = query
    ? passwords.filter((item) => {
        const siteMatch = item?.site ? item.site.toLowerCase().includes(query) : false;
        const userMatch = item?.user ? item.user.toLowerCase().includes(query) : false;
        return siteMatch || userMatch;
      })
    : passwords;

  const updatePasswords = async (updater) => {
    const nextPasswords = typeof updater === 'function' ? updater(passwords) : updater;
    setPasswords(nextPasswords);
    if (cryptoKey) {
      try {
        await saveVault(cryptoKey, nextPasswords);
      } catch (err) {
        console.error('Failed to save passwords to encrypted vault:', err);
      }
    }
    return nextPasswords;
  };

  const handleAddPassword = async (newEntry) => {
    return await updatePasswords((prev) => [...prev, newEntry]);
  };

  const handleUpdatePassword = async (updatedEntry) => {
    const result = await updatePasswords((prev) =>
      prev.map((item) => (item.id === updatedEntry.id ? updatedEntry : item))
    );
    setEditingPassword(null);
    return result;
  };

  const handleStartEdit = (item) => {
    setEditingPassword({ ...item });
    const firstField = document.getElementById('website') || document.querySelector('input[name="website"]');
    firstField?.focus();
  };

  const handleCancelEdit = () => {
    setEditingPassword(null);
  };

  const handleDelete = async (id) => {
    const result = await updatePasswords((prev) => prev.filter((item) => item.id !== id));
    if (editingPassword && editingPassword.id === id) {
      setEditingPassword(null);
    }
    return result;
  };

  const handleUnlock = async (key) => {
    setCryptoKey(key || null);
    setUnlocked(true);
    setVaultError('');

    if (!key) {
      setPasswords([]);
      return;
    }

    try {
      const oldPlain = localStorage.getItem('passwords');
      if (oldPlain !== null) {
        let plainList = [];
        try {
          const parsed = JSON.parse(oldPlain);
          if (Array.isArray(parsed)) {
            plainList = parsed;
          }
        } catch (e) {
          console.error('Failed to parse plain passwords during migration:', e);
        }
        await saveVault(key, plainList);
        localStorage.removeItem('passwords');
        setPasswords(plainList);
      } else {
        const rawVault = localStorage.getItem('vault');
        if (rawVault) {
          const decrypted = await loadVault(key, rawVault);
          setPasswords(decrypted);
        } else {
          setPasswords([]);
        }
      }
    } catch (err) {
      console.error('Failed to load or decrypt vault:', err);
      setPasswords([]);
      setVaultError('Failed to decrypt vault. Please check your master password or vault data.');
    }
  };

  const handleLock = () => {
    setEditingPassword(null);
    setCryptoKey(null);
    setPasswords([]);
    setVaultError('');
    setSearchQuery('');
    setUnlocked(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-top">
          <h1 className="app-title">Password Manager</h1>
          {unlocked && (
            <button
              type="button"
              className="lock-btn secondary-btn"
              onClick={handleLock}
              aria-label="Lock"
            >
              <svg className="lock-btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>Lock</span>
            </button>
          )}
        </div>
        <p className="app-subtitle">Safely keep track of your websites and login usernames</p>
      </header>

      <main className="app-main">
        {unlocked ? (
          <>
            {vaultError && (
              <div className="error-text vault-error" role="alert">
                {vaultError}
              </div>
            )}
            <PasswordForm
              onAddPassword={handleAddPassword}
              onUpdatePassword={handleUpdatePassword}
              editingPassword={editingPassword}
              onCancelEdit={handleCancelEdit}
              setPasswords={updatePasswords}
            />
            <div className="search-section" role="search">
              <label htmlFor="search-input" className="search-label sr-only">
                Search passwords
              </label>
              <div className="search-input-wrapper">
                <span className="search-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  id="search-input"
                  name="search"
                  type="text"
                  placeholder="Search by site or username"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input search-input"
                  aria-label="Search by site or username"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <PasswordList
              passwords={filteredPasswords}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
              editingId={editingPassword ? editingPassword.id : null}
              searchTerm={searchQuery}
              onSearchChange={setSearchQuery}
              isSearching={Boolean(query)}
            />
          </>
        ) : (
          <MasterPasswordLock onUnlock={handleUnlock} />
        )}
      </main>
    </div>
  );
}
