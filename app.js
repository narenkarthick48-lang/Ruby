/* =========================================================
   ZUZII — APP.JS
   Firebase + Authentication + Firestore Chat
   ========================================================= */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   1. FIREBASE CONFIG
   ========================================================= */

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};


/* =========================================================
   2. INITIALIZE FIREBASE
   ========================================================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


/* =========================================================
   3. GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentChatUser = null;
let currentChatId = null;

let unsubscribeMessages = null;
let unsubscribeChats = null;

let typingTimeout = null;


/* =========================================================
   4. DOM HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

const authScreen = $("authScreen");
const mainApp = $("mainApp");
const loginForm = $("loginForm");
const signupForm = $("signupForm");
const authMessage = $("authMessage");


/* =========================================================
   5. UI HELPERS
   ========================================================= */

function showMessage(message, success = false) {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.style.color = success
    ? "#4ee3a5"
    : "#ff7a9d";
}

function showLoading(show = true) {
  const loading = $("loadingScreen");

  if (!loading) return;

  loading.classList.toggle("hidden", !show);
}

function showToast(message) {
  const toast = $("toast");
  const toastMessage = $("toastMessage");

  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;

  toast.classList.remove("hidden");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2500);
}


/* =========================================================
   6. LOGIN / SIGNUP UI
   ========================================================= */

window.showSignup = function () {
  loginForm.classList.add("hidden");
  signupForm.classList.remove("hidden");
  showMessage("");
};

window.showLogin = function () {
  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  showMessage("");
};

window.togglePassword = function () {
  const input = $("passwordInput");

  if (!input) return;

  input.type =
    input.type === "password"
      ? "text"
      : "password";
};


/* =========================================================
   7. SIGN UP
   ========================================================= */

window.signupUser = async function () {

  const name = $("signupName").value.trim();
  const username = $("signupUsername").value.trim().toLowerCase();
  const email = $("signupEmail").value.trim();
  const password = $("signupPassword").value;

  if (!name || !username || !email || !password) {
    showMessage("Please fill all fields.");
    return;
  }

  if (username.length < 3) {
    showMessage("Username must be at least 3 characters.");
    return;
  }

  if (password.length < 6) {
    showMessage("Password must contain at least 6 characters.");
    return;
  }

  try {

    showLoading(true);

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = credential.user;

    await updateProfile(user, {
      displayName: name
    });

    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        name: name,
        username: username,
        email: email,
        photoURL: "",
        bio: "",
        status: "online",
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp()
      }
    );

    showToast("Welcome to ZUZII ✨");

  } catch (error) {

    console.error(error);

    showMessage(getFirebaseError(error));

  } finally {

    showLoading(false);

  }
};


/* =========================================================
   8. LOGIN
   ========================================================= */

window.loginUser = async function () {

  const email = $("emailInput").value.trim();
  const password = $("passwordInput").value;

  if (!email || !password) {
    showMessage("Enter your email and password.");
    return;
  }

  try {

    showLoading(true);

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    showToast("Welcome back 👋");

  } catch (error) {

    console.error(error);

    showMessage(getFirebaseError(error));

  } finally {

    showLoading(false);

  }
};


/* =========================================================
   9. FIREBASE ERROR HANDLER
   ========================================================= */

function getFirebaseError(error) {

  switch (error.code) {

    case "auth/invalid-credential":
      return "Email or password is incorrect.";

    case "auth/email-already-in-use":
      return "This email is already registered.";

    case "auth/invalid-email":
      return "Please enter a valid email.";

    case "auth/weak-password":
      return "Password is too weak.";

    case "auth/user-not-found":
      return "Account not found.";

    case "auth/network-request-failed":
      return "Network error. Check your internet.";

    default:
      return error.message || "Something went wrong.";
  }
}


/* =========================================================
   10. AUTH STATE
   ========================================================= */

onAuthStateChanged(auth, async (user) => {

  if (user) {

    currentUser = user;

    authScreen.classList.add("hidden");
    mainApp.classList.remove("hidden");

    await loadMyProfile();

    loadChats();

    loadStories();

  } else {

    currentUser = null;

    authScreen.classList.remove("hidden");
    mainApp.classList.add("hidden");

    if (unsubscribeMessages) {
      unsubscribeMessages();
      unsubscribeMessages = null;
    }

    if (unsubscribeChats) {
      unsubscribeChats();
      unsubscribeChats = null;
    }

  }

});


/* =========================================================
   11. LOAD MY PROFILE
   ========================================================= */

async function loadMyProfile() {

  if (!currentUser) return;

  try {

    const userRef =
      doc(db, "users", currentUser.uid);

    const snap = await getDoc(userRef);

    if (!snap.exists()) return;

    const data = snap.data();

    $("myName").textContent =
      data.name || currentUser.displayName || "User";

    $("myAvatar").textContent =
      getInitial(data.name || "User");

  } catch (error) {

    console.error(
      "Profile error:",
      error
    );

  }
}


/* =========================================================
   12. CHAT ID
   ========================================================= */

function createChatId(uid1, uid2) {

  return [uid1, uid2]
    .sort()
    .join("_");

}


/* =========================================================
   13. OPEN NEW CHAT
   ========================================================= */

window.openNewChat = function () {

  $("newChatModal").classList.remove("hidden");

  $("userSearch").value = "";

  $("userSearchResults").innerHTML = "";

};

window.closeNewChat = function () {

  $("newChatModal").classList.add("hidden");

};


/* =========================================================
   14. SEARCH USERS
   ========================================================= */

window.searchUsers = async function () {

  const text =
    $("userSearch").value
      .trim()
      .toLowerCase();

  const results =
    $("userSearchResults");

  if (!text) {

    results.innerHTML = "";

    return;
  }

  try {

    const usersRef =
      collection(db, "users");

    const snap =
      await getDocs(usersRef);

    results.innerHTML = "";

    let found = 0;

    snap.forEach((docSnap) => {

      const user = docSnap.data();

      if (
        user.uid !== currentUser.uid &&
        (
          user.username?.includes(text) ||
          user.name?.toLowerCase().includes(text)
        )
      ) {

        found++;

        const item =
          document.createElement("div");

        item.className = "user-result";

        item.innerHTML = `
          <div class="avatar gradient-avatar">
            ${getInitial(user.name || "U")}
          </div>

          <div class="user-result-info">
            <strong>${escapeHTML(user.name || "User")}</strong>
            <span>@${escapeHTML(user.username || "user")}</span>
          </div>

          <i class="fa-solid fa-chevron-right"></i>
        `;

        item.onclick = () => {
          startChat(user);
          closeNewChat();
        };

        results.appendChild(item);
      }

    });

    if (!found) {

      results.innerHTML = `
        <div class="empty-chat-list">
          <h3>No users found</h3>
          <p>Try another username.</p>
        </div>
      `;

    }

  } catch (error) {

    console.error(error);

    showToast("Could not search users.");

  }

};


/* =========================================================
   15. START CHAT
   ========================================================= */

async function startChat(user) {

  currentChatUser = user;

  currentChatId =
    createChatId(
      currentUser.uid,
      user.uid
    );

  await setDoc(
    doc(db, "chats", currentChatId),
    {
      participants: [
        currentUser.uid,
        user.uid
      ],
      updatedAt: serverTimestamp()
    },
    {
      merge: true
    }
  );

  $("emptyChat").classList.add("hidden");
  $("activeChat").classList.remove("hidden");

  $("chatUserName").textContent =
    user.name || "User";

  $("chatUserStatus").textContent =
    user.status || "offline";

  $("chatAvatar").textContent =
    getInitial(user.name || "U");

  document
    .querySelector(".main-app")
    .classList.add("chat-open");

  loadMessages();

}


/* =========================================================
   16. LOAD CHATS
   ========================================================= */

function loadChats() {

  if (!currentUser) return;

  const chatsRef =
    collection(db, "chats");

  const q =
    query(
      chatsRef,
      where(
        "participants",
        "array-contains",
        currentUser.uid
      )
    );

  if (unsubscribeChats) {
    unsubscribeChats();
  }

  unsubscribeChats =
    onSnapshot(q, async (snapshot) => {

      const chatList =
        $("chatList");

      chatList.innerHTML = "";

      if (snapshot.empty) {

        chatList.innerHTML = `
          <div class="empty-chat-list">
            <div class="empty-icon">
              <i class="fa-regular fa-comments"></i>
            </div>

            <h3>No conversations yet</h3>

            <p>
              Start a new conversation with someone.
            </p>

            <button
              class="small-primary-btn"
              onclick="openNewChat()"
            >
              Start chatting
            </button>
          </div>
        `;

        return;
      }

      for (const chatDoc of snapshot.docs) {

        const chat =
          chatDoc.data();

        const otherUid =
          chat.participants.find(
            uid => uid !== currentUser.uid
          );

        if (!otherUid) continue;

        const userSnap =
          await getDoc(
            doc(db, "users", otherUid)
          );

        if (!userSnap.exists()) continue;

        const user =
          userSnap.data();

        renderChatItem(
          chatDoc.id,
          user,
          chat
        );

      }

    });

}


/* =========================================================
   17. RENDER CHAT ITEM
   ========================================================= */

function renderChatItem(chatId, user, chat) {

  const chatList =
    $("chatList");

  const item =
    document.createElement("div");

  item.className = "chat-item";

  item.innerHTML = `
    <div class="avatar gradient-avatar">
      ${getInitial(user.name || "U")}
    </div>

    <div class="chat-info">

      <div class="chat-top">
        <h4>
          ${escapeHTML(user.name || "User")}
        </h4>

        <span class="chat-time">
          ${formatTime(chat.updatedAt)}
        </span>
      </div>

      <div class="chat-bottom">
        <span class="last-message">
          Tap to start chatting
        </span>
      </div>

    </div>
  `;

  item.onclick = () => {

    startChat({
      uid: user.uid,
      name: user.name,
      username: user.username,
      status: user.status
    });

  };

  chatList.appendChild(item);
}


/* =========================================================
   18. LOAD MESSAGES
   ========================================================= */

function loadMessages() {

  if (!currentChatId) return;

  const messagesRef =
    collection(
      db,
      "chats",
      currentChatId,
      "messages"
    );

  const q =
    query(
      messagesRef,
      orderBy("createdAt", "asc")
    );

  if (unsubscribeMessages) {
    unsubscribeMessages();
  }

  unsubscribeMessages =
    onSnapshot(q, (snapshot) => {

      const container =
        $("messagesContainer");

      container.innerHTML = "";

      snapshot.forEach((messageDoc) => {

        const message =
          messageDoc.data();

        renderMessage(
          message,
          messageDoc.id
        );

      });

      container.scrollTop =
        container.scrollHeight;

    });

}


/* =========================================================
   19. RENDER MESSAGE
   ========================================================= */

function renderMessage(message, messageId) {

  const container =
    $("messagesContainer");

  const isMine =
    message.senderId === currentUser.uid;

  const row =
    document.createElement("div");

  row.className =
    `message-row ${isMine ? "sent" : "received"}`;

  const bubble =
    document.createElement("div");

  bubble.className =
    "message-bubble";

  bubble.innerHTML = `
    <div>
      ${escapeHTML(message.text || "")}
    </div>

    <div class="message-meta">
      <span>
        ${formatTime(message.createdAt)}
      </span>

      ${
        isMine
          ? `<span class="read-tick">✓✓</span>`
          : ""
      }
    </div>
  `;

  /* Double tap reaction */

  let tapTimer = null;

  bubble.addEventListener(
    "click",
    () => {

      if (tapTimer) {

        clearTimeout(tapTimer);

        tapTimer = null;

        addReaction(
          messageId,
          "❤️"
        );

      } else {

        tapTimer = setTimeout(() => {
          tapTimer = null;
        }, 280);

      }

    }
  );

  row.appendChild(bubble);

  container.appendChild(row);

}


/* =========================================================
   20. SEND MESSAGE
   ========================================================= */

window.sendMessage = async function () {

  if (!currentUser || !currentChatId) {
    showToast("Select a chat first.");
    return;
  }

  const input =
    $("messageInput");

  const text =
    input.value.trim();

  if (!text) return;

  try {

    input.value = "";

    const messagesRef =
      collection(
        db,
        "chats",
        currentChatId,
        "messages"
      );

    await addDoc(
      messagesRef,
      {
        senderId: currentUser.uid,
        receiverId: currentChatUser.uid,
        text: text,
        type: "text",
        createdAt: serverTimestamp()
      }
    );

    await setDoc(
      doc(db, "chats", currentChatId),
      {
        participants: [
          currentUser.uid,
          currentChatUser.uid
        ],
        lastMessage: text,
        updatedAt: serverTimestamp()
      },
      {
        merge: true
      }
    );

  } catch (error) {

    console.error(error);

    showToast("Message failed.");

  }

};


/* =========================================================
   21. ENTER TO SEND
   ========================================================= */

window.handleMessageKey = function (event) {

  if (
    event.key === "Enter" &&
    !event.shiftKey
  ) {

    event.preventDefault();

    sendMessage();

  }

};


/* =========================================================
   22. TYPING
   ========================================================= */

window.handleTyping = function () {

  clearTimeout(typingTimeout);

  typingTimeout =
    setTimeout(() => {

      /* Typing indicator will be connected
         to Firestore realtime presence later */

    }, 500);

};


/* =========================================================
   23. REACTION
   ========================================================= */

async function addReaction(messageId, emoji) {

  if (!currentChatId) return;

  try {

    await setDoc(
      doc(
        db,
        "chats",
        currentChatId,
        "messages",
        messageId
      ),
      {
        reaction: emoji
      },
      {
        merge: true
      }
    );

    showToast("❤️");

  } catch (error) {

    console.error(error);

  }

}


/* =========================================================
   24. CLOSE CHAT
   ========================================================= */

window.closeChat = function () {

  document
    .querySelector(".main-app")
    .classList.remove("chat-open");

};


/* =========================================================
   25. SEARCH CHATS
   ========================================================= */

window.searchChats = function () {

  const value =
    $("chatSearch")
      .value
      .toLowerCase()
      .trim();

  const items =
    document.querySelectorAll(".chat-item");

  items.forEach(item => {

    const text =
      item.textContent.toLowerCase();

    item.style.display =
      text.includes(value)
        ? "flex"
        : "none";

  });

};


/* =========================================================
   26. STORIES
   ========================================================= */

function loadStories() {

  const row =
    $("storiesRow");

  if (!row) return;

  /* Basic starter story UI */

  const demoStories = [
    {
      name: "Friends",
      initial: "F"
    },
    {
      name: "Explore",
      initial: "E"
    },
    {
      name: "Daily",
      initial: "D"
    }
  ];

  demoStories.forEach(story => {

    const item =
      document.createElement("div");

    item.className = "story-item";

    item.innerHTML = `
      <div class="story-avatar">
        <div class="story-avatar-inner">
          ${story.initial}
        </div>
      </div>

      <span>${story.name}</span>
    `;

    item.onclick = () => {
      openStoryDemo(story);
    };

    row.appendChild(item);

  });

}


/* =========================================================
   27. STORY VIEWER
   ========================================================= */

function openStoryDemo(story) {

  const viewer =
    $("storyViewer");

  $("storyUserName").textContent =
    story.name;

  $("storyAvatar").textContent =
    story.initial;

  $("storyTime").textContent =
    "Just now";

  $("storyContent").innerHTML = `
    <div style="
      width:100%;
      height:100%;
      display:grid;
      place-items:center;
      background:
        linear-gradient(
          135deg,
          rgba(91,75,255,.9),
          rgba(240,76,155,.9)
        );
    ">
      <div style="
        text-align:center;
        padding:30px;
      ">
        <div style="
          font-size:60px;
          margin-bottom:15px;
        ">
          ✨
        </div>

        <h2>${escapeHTML(story.name)}</h2>

        <p style="
          margin-top:8px;
          opacity:.7;
        ">
          ZUZII Story
        </p>
      </div>
    </div>
  `;

  viewer.classList.remove("hidden");

  const progress =
    document.querySelector(".progress-line");

  progress.style.transition = "none";
  progress.style.width = "0%";

  setTimeout(() => {

    progress.style.transition =
      "width 5s linear";

    progress.style.width =
      "100%";

  }, 50);

}

window.openAllStories = function () {

  showToast("Stories opened");

};

window.closeStoryViewer = function () {

  $("storyViewer").classList.add("hidden");

};

window.createStory = function () {

  showToast("Story upload coming next 📸");

};

window.reactToStory = function (emoji) {

  showToast(`${emoji} Reaction sent`);

};

window.replyToStory = function () {

  const input =
    $("storyReplyInput");

  if (!input.value.trim()) return;

  input.value = "";

  showToast("Story reply sent");

};


/* =========================================================
   28. ATTACHMENTS
   ========================================================= */

window.openAttachmentMenu = function () {

  $("attachmentMenu")
    .classList.toggle("hidden");

};

window.selectPhoto = function () {
  $("photoInput").click();
};

window.selectVideo = function () {
  $("videoInput").click();
};

window.selectDocument = function () {
  $("documentInput").click();
};

window.selectCamera = function () {

  showToast("Camera upload coming next 📷");

};

window.handlePhoto = function (event) {

  const file =
    event.target.files[0];

  if (!file) return;

  showToast(
    `${file.name} selected`
  );

};

window.handleVideo = function (event) {

  const file =
    event.target.files[0];

  if (!file) return;

  showToast(
    `${file.name} selected`
  );

};

window.handleDocument = function (event) {

  const file =
    event.target.files[0];

  if (!file) return;

  showToast(
    `${file.name} selected`
  );

};


/* =========================================================
   29. EMOJI
   ========================================================= */

window.toggleEmojiPicker = function () {

  const input =
    $("messageInput");

  input.value += "😊";

  input.focus();

};


/* =========================================================
   30. VOICE
   ========================================================= */

window.startVoiceRecording = function () {

  showToast(
    "Voice recording will connect to Firebase Storage next 🎙️"
  );

};


/* =========================================================
   31. CALLS
   ========================================================= */

window.startVoiceCall = function () {

  showToast(
    "Voice call module coming next 📞"
  );

};

window.startVideoCall = function () {

  showToast(
    "Video call module coming next 📹"
  );

};


/* =========================================================
   32. OTHER BUTTONS
   ========================================================= */

window.openSettings = function () {

  showToast(
    "Settings module coming next ⚙️"
  );

};

window.openChatInfo = function () {

  showToast(
    "Chat information coming next"
  );

};


/* =========================================================
   33. LOGOUT
   ========================================================= */

window.logoutUser = async function () {

  try {

    await signOut(auth);

    showToast("Logged out");

  } catch (error) {

    console.error(error);

  }

};


/* =========================================================
   34. UTILITIES
   ========================================================= */

function getInitial(name) {

  if (!name) return "U";

  return name
    .trim()
    .charAt(0)
    .toUpperCase();

}


function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function formatTime(timestamp) {

  if (!timestamp) return "now";

  try {

    const date =
      timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

    return date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  } catch {

    return "now";

  }

}


/* =========================================================
   ZUZII READY
   ========================================================= */

console.log(
  "✨ ZUZII Firebase app initialized"
);
