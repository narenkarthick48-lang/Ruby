import React, { useState } from "react";
import "./styles.css";

const users = [
  {
    id: 1,
    name: "Anu",
    avatar: "A",
    online: true,
    message: "Heyy! Where are you? 👀",
    time: "2:42 PM",
    unread: 3,
  },
  {
    id: 2,
    name: "Karthi",
    avatar: "K",
    online: true,
    message: "Bro, tomorrow class iruka?",
    time: "1:58 PM",
    unread: 1,
  },
  {
    id: 3,
    name: "Ruby AI",
    avatar: "R",
    online: true,
    message: "How can I help you today?",
    time: "12:30 PM",
    unread: 0,
  },
  {
    id: 4,
    name: "Friends Group",
    avatar: "F",
    online: false,
    message: "You: Okay da 😂",
    time: "Yesterday",
    unread: 0,
  },
];

const initialMessages = {
  1: [
    {
      id: 1,
      sender: "them",
      text: "Heyy! 👋",
      time: "2:39 PM",
      seen: true,
    },
    {
      id: 2,
      sender: "me",
      text: "Hey! What's up?",
      time: "2:40 PM",
      seen: true,
    },
    {
      id: 3,
      sender: "them",
      text: "Nothing much 😌 Where are you?",
      time: "2:42 PM",
      seen: true,
    },
  ],
  2: [
    {
      id: 1,
      sender: "them",
      text: "Bro, tomorrow class iruka?",
      time: "1:58 PM",
      seen: true,
    },
  ],
  3: [
    {
      id: 1,
      sender: "them",
      text: "Hello! I'm Ruby Maxiee 🌹",
      time: "12:28 PM",
      seen: true,
    },
    {
      id: 2,
      sender: "them",
      text: "How can I help you today?",
      time: "12:30 PM",
      seen: true,
    },
  ],
  4: [
    {
      id: 1,
      sender: "them",
      text: "Guys tomorrow meet?",
      time: "Yesterday",
      seen: true,
    },
    {
      id: 2,
      sender: "me",
      text: "Okay da 😂",
      time: "Yesterday",
      seen: true,
    },
  ],
};

function App() {
  const [activeChat, setActiveChat] = useState(users[0]);
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [theme, setTheme] = useState("ruby");
  const [typing, setTyping] = useState(false);

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  const sendMessage = () => {
    const value = text.trim();

    if (!value) return;

    const newMessage = {
      id: Date.now(),
      sender: "me",
      text: value,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      seen: false,
    };

    setMessages((prev) => ({
      ...prev,
      [activeChat.id]: [...(prev[activeChat.id] || []), newMessage],
    }));

    setText("");
    setTyping(false);

    setTimeout(() => {
      setTyping(true);

      setTimeout(() => {
        setTyping(false);
      }, 1600);
    }, 400);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addReaction = (messageId) => {
    setMessages((prev) => ({
      ...prev,
      [activeChat.id]: prev[activeChat.id].map((msg) =>
        msg.id === messageId
          ? { ...msg, reaction: msg.reaction === "❤️" ? null : "❤️" }
          : msg
      ),
    }));
  };

  const currentMessages = messages[activeChat.id] || [];

  return (
    <div className={`app ${theme}`}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <h1>Ruby</h1>
            <span>MAXIEE</span>
          </div>
        </div>

        <div className="profile-mini" onClick={() => setShowProfile(true)}>
          <div className="avatar large ruby-avatar">N</div>

          <div className="profile-mini-info">
            <strong>Naren</strong>
            <span>Online</span>
          </div>

          <button
            className="more-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
          >
            ⋮
          </button>
        </div>

        {showMenu && (
          <div className="floating-menu">
            <button onClick={() => setShowProfile(true)}>Profile</button>
            <button>Settings</button>
            <button>Logout</button>
          </div>
        )}

        <div className="search-box">
          <span>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats"
          />
        </div>

        {/* STORIES */}
        <div className="stories">
          <div className="section-title">
            <span>Stories</span>
            <button>+</button>
          </div>

          <div className="story-row">
            <div className="story add-story">
              <div className="story-avatar">+</div>
              <small>Your story</small>
            </div>

            {["A", "K", "R", "S"].map((letter, index) => (
              <div className="story" key={index}>
                <div className="story-avatar story-active">{letter}</div>
                <small>{["Anu", "Karthi", "Ruby", "Sara"][index]}</small>
              </div>
            ))}
          </div>
        </div>

        {/* CHAT LIST */}
        <div className="chat-heading">
          <span>Messages</span>
          <span className="chat-count">{filteredUsers.length}</span>
        </div>

        <div className="chat-list">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`chat-item ${
                activeChat.id === user.id ? "active" : ""
              }`}
              onClick={() => setActiveChat(user)}
            >
              <div className="avatar-wrap">
                <div className="avatar">{user.avatar}</div>
                {user.online && <i className="online-dot" />}
              </div>

              <div className="chat-info">
                <div className="chat-top">
                  <strong>{user.name}</strong>
                  <time>{user.time}</time>
                </div>

                <div className="chat-bottom">
                  <span>{user.message}</span>

                  {user.unread > 0 && (
                    <b className="unread">{user.unread}</b>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          className="new-chat"
          onClick={() => alert("New chat UI coming next 🚀")}
        >
          <span>+</span>
          New message
        </button>
      </aside>

      {/* CHAT AREA */}
      <main className="chat-area">
        <header className="chat-header">
          <div className="mobile-back">‹</div>

          <div className="avatar-wrap">
            <div className="avatar">{activeChat.avatar}</div>
            {activeChat.online && <i className="online-dot" />}
          </div>

          <div className="header-info">
            <strong>{activeChat.name}</strong>
            <span>
              {activeChat.online ? "Active now" : "Last seen recently"}
            </span>
          </div>

          <div className="header-actions">
            <button title="Search">⌕</button>
            <button title="Call">◯</button>
            <button
              title="More"
              onClick={() => setShowMenu(!showMenu)}
            >
              ⋮
            </button>
          </div>
        </header>

        {/* MESSAGES */}
        <section className="messages">
          <div className="date-divider">
            <span>Today</span>
          </div>

          {currentMessages.map((message) => (
            <div
              key={message.id}
              className={`message-row ${
                message.sender === "me" ? "mine" : ""
              }`}
            >
              <div
                className={`message ${
                  message.sender === "me" ? "mine" : ""
                }`}
                onDoubleClick={() => addReaction(message.id)}
              >
                <p>{message.text}</p>

                <div className="message-meta">
                  <time>{message.time}</time>

                  {message.sender === "me" && (
                    <span className={message.seen ? "seen" : ""}>
                      ✓✓
                    </span>
                  )}
                </div>

                {message.reaction && (
                  <button
                    className="reaction"
                    onClick={() => addReaction(message.id)}
                  >
                    {message.reaction}
                  </button>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className="typing-row">
              <div className="typing">
                <i />
                <i />
                <i />
              </div>
              <span>{activeChat.name} is typing...</span>
            </div>
          )}
        </section>

        {/* COMPOSER */}
        <footer className="composer">
          <button className="composer-btn">＋</button>

          <div className="input-area">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write something..."
              rows="1"
            />

            <button className="emoji-btn">☺</button>
          </div>

          {text.trim() ? (
            <button className="send-btn" onClick={sendMessage}>
              ➤
            </button>
          ) : (
            <button
              className="voice-btn"
              onClick={() => alert("Voice recording UI")}
            >
              🎙
            </button>
          )}
        </footer>
      </main>

      {/* PROFILE PANEL */}
      {showProfile && (
        <div className="overlay" onClick={() => setShowProfile(false)}>
          <div
            className="profile-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-btn"
              onClick={() => setShowProfile(false)}
            >
              ×
            </button>

            <div className="profile-cover">
              <div className="profile-big-avatar">N</div>
            </div>

            <div className="profile-content">
              <h2>Naren</h2>
              <span className="username">@naren</span>

              <p>
                Building something beautiful with AI. 🌹
              </p>

              <div className="profile-stats">
                <div>
                  <b>128</b>
                  <span>Following</span>
                </div>

                <div>
                  <b>246</b>
                  <span>Followers</span>
                </div>
              </div>

              <div className="settings-section">
                <h3>Appearance</h3>

                <button
                  className="theme-option"
                  onClick={() => setTheme("ruby")}
                >
                  <span>🌹</span>
                  Ruby Dark
                  {theme === "ruby" && <b>✓</b>}
                </button>

                <button
                  className="theme-option"
                  onClick={() => setTheme("midnight")}
                >
                  <span>🌑</span>
                  Midnight
                  {theme === "midnight" && <b>✓</b>}
                </button>
              </div>

              <button className="edit-profile">
                Edit profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
