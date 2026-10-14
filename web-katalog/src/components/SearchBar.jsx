import { SearchIcon, CloseIcon } from './icons'
import './SearchBar.css'

function SearchBar({ value, onChange, placeholder = 'Cari produk...' }) {
  return (
    <div className="search-bar">
      <span className="search-icon">
        <SearchIcon />
      </span>
      <input
        type="text"
        className="search-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label="Cari produk"
      />
      {value && (
        <button
          type="button"
          className="search-clear"
          onClick={() => onChange('')}
          aria-label="Hapus pencarian"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  )
}

export default SearchBar
