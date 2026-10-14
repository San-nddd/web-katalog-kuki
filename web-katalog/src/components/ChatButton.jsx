import './ChatButton.css'

function ChatButton({ onClick }) {
  return (
    <button type="button" className="chat-button" onClick={onClick} aria-label="Buka Kuki Assistant">
      <span className="chat-icon" aria-hidden="true">
        💬
      </span>
    </button>
  )
}

export default ChatButton
