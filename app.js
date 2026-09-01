/* =========================================================
   ZUZII — APP.JS
   Firebase Authentication + Firestore Chat
   ========================================================= */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile
} from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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
} from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   1. FIREBASE CONFIG
   ========================================================= */

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBv30wRnc9CJAo0mFQF_7nAXuytZyurfkk",
  authDomain: "ruba-34782.firebaseapp.com",
  projectId: "ruba-34782",
  storageBucket: "ruba-34782.firebasestorage.app",
  messagingSenderId: "916875849283",
  appId: "1:916875849283:web:79bd7170ade790527eeef6",
  measurementId: "G-YY47Z8PCXQ"
};


/* =========================================================
   2. INITIALIZE
   ========================================================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


/* =========================================================
   3. STATE
   ========================================================= */

let currentUser = null;
let currentChatUser = null;
let currentChatId = null;

let unsubscribeMessages = null;
let unsubscribeChats = null;


/* =========================================================
   4. HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

function showMessage(message, success = false) {

  const box = $("authMessage");

  if (!box) return;

  box.textContent = message;

  box.style.color = success
    ? "#4ee3a5"
    : "#ff7a9d";
}


function showLoading(show = true) {

  const loading = $("loadingScreen");

  if (!loading) return;

  loading.classList.toggle(
    "hidden",
    !show
  );
}


function showToast(message) {

  const toast = $("toast");
  const toastMessage = $("toastMessage");

  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;

  toast.classList.remove("hidden");

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {

    toast.classList.add("hidden");

  }, 2500);
}


function getInitial(name) {

  if (!name) return "U";

  return name
    .trim()
    .charAt(0)
    .toUpperCase();
}


function escapeHTML(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function formatTime(timestamp) {

  if (!timestamp) return "";

  try {

    const date =
      typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

  } catch {

    return "";

  }
}


function createChatId(uid1, uid2) {

  return [uid1, uid2]
    .sort()
    .join("_");

}


/* =========================================================
   5. LOGIN / SIGNUP UI
   ========================================================= */

window.showSignup = function () {

  $("loginForm")?.classList.add("hidden");
  $("signupForm")?.classList.remove("hidden");

  showMessage("");

};


window.showLogin = function () {

  $("signupForm")?.classList.add("hidden");
  $("loginForm")?.classList.remove("hidden");

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
   6. SIGN UP
   ========================================================= */

window.signupUser = async function () {

  const name =
    $("signupName")?.value.trim();

  const username =
    $("signupUsername")?.value
      .trim()
      .toLowerCase();

  const email =
    $("signupEmail")?.value.trim();

  const password =
    $("signupPassword")?.value;

  if (!name || !username || !email || !password) {

    showMessage("Please fill all fields.");

    return;
  }

  if (username.length < 3) {

    showMessage(
      "Username must be at least 3 characters."
    );

    return;
  }

  if (password.length < 6) {

    showMessage(
      "Password must contain at least 6 characters."
    );

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

    showMessage(
      getFirebaseError(error)
    );

  } finally {

    showLoading(false);

  }

};


/* =========================================================
   7. LOGIN
   ========================================================= */

window.loginUser = async function () {

  const email =
    $("emailInput")?.value.trim();

  const password =
    $("passwordInput")?.value;

  if (!email || !password) {

    showMessage(
      "Enter your email and password."
    );

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

    showMessage(
      getFirebaseError(error)
    );

  } finally {

    showLoading(false);

  }

};


/* =========================================================
   8. FIREBASE ERROR
   ========================================================= */

function getFirebaseError(error) {

  switch (error.code) {

    case "auth/invalid-credential":
      return "Email or password is incorrect.";

    case "auth/email-already-in-use":
      return "Email is already registered.";

    case "auth/invalid-email":
      return "Enter a valid email.";

    case "auth/weak-password":
      return "Password must contain at least 6 characters.";

    case "auth/user-not-found":
      return "Account not found.";

    case "auth/network-request-failed":
      return "Network error. Check your internet.";

    case "permission-denied":
      return "Firebase permission denied.";

    default:
      return error.message ||
        "Something went wrong.";
  }

}


/* =========================================================
   9. AUTH STATE
   ========================================================= */

onAuthStateChanged(
  auth,
  async (user) => {

    if (user) {

      currentUser = user;

      $("authScreen")?.classList.add("hidden");

      $("mainApp")?.classList.remove("hidden");

      await loadMyProfile();

      loadChats();

      loadStories();

    } else {

      currentUser = null;

      currentChatUser = null;
      currentChatId = null;

      $("authScreen")?.classList.remove("hidden");

      $("mainApp")?.classList.add("hidden");

      if (unsubscribeMessages) {

        unsubscribeMessages();
        unsubscribeMessages = null;

      }

      if (unsubscribeChats) {

        unsubscribeChats();
        unsubscribeChats = null;

      }

    }

  }
);


/* =========================================================
   10. MY PROFILE
   ========================================================= */

async function loadMyProfile() {

  if (!currentUser) return;

  try {

    const snap =
      await getDoc(
        doc(db, "users", currentUser.uid)
      );

    if (!snap.exists()) return;

    const data = snap.data();

    $("myName").textContent =
      data.name ||
      currentUser.displayName ||
      "User";

    $("myAvatar").textContent =
      getInitial(
        data.name ||
        currentUser.displayName ||
        "User"
      );

    $("myStatus").textContent =
      "Online";

  } catch (error) {

    console.error(
      "Profile error:",
      error
    );

  }

}


/* =========================================================
   11. NEW CHAT
   ========================================================= */

window.openNewChat = function () {

  $("newChatModal")?.classList.remove(
    "hidden"
  );

  if ($("userSearch")) {
    $("userSearch").value = "";
  }

  if ($("userSearchResults")) {
    $("userSearchResults").innerHTML = "";
  }

};


window.closeNewChat = function () {

  $("newChatModal")?.classList.add(
    "hidden"
  );

};


/* =========================================================
   12. SEARCH USERS
   ========================================================= */

window.searchUsers = async function () {

  const input = $("userSearch");

  const results =
    $("userSearchResults");

  if (!input || !results) return;

  const text =
    input.value
      .trim()
      .toLowerCase();

  if (!text) {

    results.innerHTML = "";

    return;
  }

  try {

    const snap =
      await getDocs(
        collection(db, "users")
      );

    results.innerHTML = "";

    let found = 0;

    snap.forEach(userDoc => {

      const user =
        userDoc.data();

      if (
        user.uid !== currentUser.uid &&
        (
          user.username
            ?.toLowerCase()
            .includes(text) ||

          user.name
            ?.toLowerCase()
            .includes(text)
        )
      {

        found++;

        const item =
          document.createElement("div");

        item.className =
          "user-result";

        item.innerHTML = `

          <div class="avatar gradient-avatar">
            ${escapeHTML(
              getInitial(user.name)
            )}
          </div>

          <div class="user-result-info">

            <strong>
              ${escapeHTML(
                user.name || "User"
              )}
            </strong>

            <span>
              @${escapeHTML(
                user.username || "user"
              )}
            </span>

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

          <p>
            Try another username.
          </p>

        </div>

      `;

    }

  } catch (error) {

    console.error(error);

    showToast(
      "Could not search users."
    );

  }

};


/* =========================================================
   13. START CHAT
   ========================================================= */

async function startChat(user) {

  if (!currentUser || !user?.uid) return;

  currentChatUser = user;

  currentChatId =
    createChatId(
      currentUser.uid,
      user.uid
    );

  try {

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

    $("emptyChat")?.classList.add(
      "hidden"
    );

    $("activeChat")?.classList.remove(
      "hidden"
    );

    $("chatUserName").textContent =
      user.name || "User";

    $("chatUserStatus").textContent =
      user.status || "offline";

    $("chatAvatar").textContent =
      getInitial(
        user.name || "User"
      );

    $("mainApp")?.classList.add(
      "chat-open"
    );

    loadMessages();

  } catch (error) {

    console.error(error);

    showToast(
      "Could not open chat."
    );

  }

}


/* =========================================================
   14. LOAD CHATS
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
    onSnapshot(
      q,
      async (snapshot) => {

        const chatList =
          $("chatList");

        if (!chatList) return;

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

        const chats = [];

        for (const chatDoc of snapshot.docs) {

          const chat =
            chatDoc.data();

          const otherUid =
            chat.participants?.find(
              uid =>
                uid !== currentUser.uid
            );

          if (!otherUid) continue;

          try {

            const userSnap =
              await getDoc(
                doc(
                  db,
                  "users",
                  otherUid
                )
              );

            if (!userSnap.exists()) continue;

            chats.push({
              id: chatDoc.id,
              user: userSnap.data(),
              chat: chat
            });

          } catch (error) {

            console.error(error);

          }

        }

        chats.sort((a, b) => {

          const aTime =
            a.chat.updatedAt?.seconds || 0;

          const bTime =
            b.chat.updatedAt?.seconds || 0;

          return bTime - aTime;

        });

        chats.forEach(item => {

          renderChatItem(
            item.id,
            item.user,
            item.chat
          );

        });

      },
      error => {

        console.error(
          "Chat listener error:",
          error
        );

        showToast(
          "Could not load chats."
        );

      }
    );

}


/* =========================================================
   15. CHAT ITEM
   ========================================================= */

function renderChatItem(
  chatId,
  user,
  chat
) {

  const chatList =
    $("chatList");

  if (!chatList) return;

  const item =
    document.createElement("div");

  item.className =
    "chat-item";

  item.innerHTML = `

    <div class="avatar gradient-avatar">
      ${escapeHTML(
        getInitial(user.name || "U")
      )}
    </div>

    <div class="chat-info">

      <div class="chat-top">

        <h4>
          ${escapeHTML(
            user.name || "User"
          )}
        </h4>

        <span class="chat-time">
          ${formatTime(
            chat.updatedAt
          )}
        </span>

      </div>

      <div class="chat-bottom">

        <span class="last-message">
          ${escapeHTML(
            chat.lastMessage ||
            "Tap to start chatting"
          )}
        </span>

      </div>

    </div>
  `;

  item.onclick = () => {

    startChat(user);

  };

  chatList.appendChild(item);

}


/* =========================================================
   16. LOAD MESSAGES
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
      orderBy(
        "createdAt",
        "asc"
      )
    );

  if (unsubscribeMessages) {

    unsubscribeMessages();

  }

  unsubscribeMessages =
    onSnapshot(
      q,
      snapshot => {

        const container =
          $("messagesContainer");

        if (!container) return;

        container.innerHTML = "";

        snapshot.forEach(
          messageDoc => {

            renderMessage(
              messageDoc.data(),
              messageDoc.id
            );

          }
        );

        requestAnimationFrame(() => {

          container.scrollTop =
            container.scrollHeight;

        });

      },
      error => {

        console.error(
          "Messages error:",
          error
        );

        showToast(
          "Could not load messages."
        );

      }
    );

}


/* =========================================================
   17. RENDER MESSAGE
   ========================================================= */

function renderMessage(
  message,
  messageId
) {

  const container =
    $("messagesContainer");

  if (!container) return;

  const isMine =
    message.senderId ===
    currentUser.uid;

  const row =
    document.createElement("div");

  row.className =
    `message-row ${
      isMine
        ? "sent"
        : "received"
    }`;

  const bubble =
    document.createElement("div");

  bubble.className =
    "message-bubble";

  bubble.innerHTML = `

    <div class="message-text">
      ${escapeHTML(
        message.text || ""
      )}
    </div>

    <div class="message-meta">

      <span>
        ${formatTime(
          message.createdAt
        )}
      </span>

      ${
        isMine
          ? `<span class="read-tick">✓✓</span>`
          : ""
      }

    </div>

    ${
      message.reaction
        ? `
          <span class="message-reaction">
            ${escapeHTML(
              message.reaction
            )}
          </span>
        `
        : ""
    }

  `;

  let lastTap = 0;

  bubble.addEventListener(
    "click",
    () => {

      const now =
        Date.now();

      if (
        now - lastTap <
        350
      ) {

        addReaction(
          messageId,
          "❤️"
        );

      }

      lastTap = now;

    }
  );

  row.appendChild(bubble);

  container.appendChild(row);

}


/* =========================================================
   18. SEND MESSAGE
   ========================================================= */

window.sendMessage =
  async function () {

    if (
      !currentUser ||
      !currentChatId ||
      !currentChatUser
    ) {

      showToast(
        "Select a chat first."
      );

      return;
    }

    const input =
      $("messageInput");

    if (!input) return;

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
          senderId:
            currentUser.uid,

          receiverId:
            currentChatUser.uid,

          text: text,

          type: "text",

          createdAt:
            serverTimestamp()
        }
      );

      await setDoc(
        doc(
          db,
          "chats",
          currentChatId
        ),
        {
          participants: [
            currentUser.uid,
            currentChatUser.uid
          ],

          lastMessage: text,

          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );

    } catch (error) {

      console.error(error);

      showToast(
        "Message failed."
      );

      input.value = text;

    }

  };


/* =========================================================
   19. ENTER SEND
   ========================================================= */

window.handleMessageKey =
  function (event) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      window.sendMessage();

    }

  };


/* =========================================================
   20. TYPING
   ========================================================= */

window.handleTyping =
  function () {

    /* Future realtime typing system */

  };


/* =========================================================
   21. REACTION
   ========================================================= */

async function addReaction(
  messageId,
  emoji
) {

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

  } catch (error) {

    console.error(
      "Reaction error:",
      error
    );

  }

}


/* =========================================================
   22. CLOSE CHAT
   ========================================================= */

window.closeChat = function () {

  $("mainApp")?.classList.remove(
    "chat-open"
  );

};


/* =========================================================
   23. SEARCH CHATS
   ========================================================= */

window.searchChats =
  function () {

    const input =
      $("chatSearch");

    if (!input) return;

    const value =
      input.value
        .toLowerCase()
        .trim();

    document
      .querySelectorAll(".chat-item")
      .forEach(item => {

        item.style.display =
          item.textContent
            .toLowerCase()
            .includes(value)
              ? "flex"
              : "none";

      });

  };


/* =========================================================
   24. STORIES
   ========================================================= */

function loadStories() {

  const row =
    $("storiesRow");

  if (!row) return;

  row
    .querySelectorAll(
      ".story-item"
    )
    .forEach(item =>
      item.remove()
    );

  const stories = [
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

  stories.forEach(
    story => {

      const item =
        document.createElement("div");

      item.className =
        "story-item";

      item.innerHTML = `

        <div class="story-avatar">

          <div class="story-avatar-inner">
            ${story.initial}
          </div>

        </div>

        <span>
          ${escapeHTML(
            story.name
          )}
        </span>

      `;

      item.onclick = () =>
        openStoryDemo(story);

      row.appendChild(item);

    }
  );

}


/* =========================================================
   25. STORY VIEWER
   ========================================================= */

function openStoryDemo(story) {

  const viewer =
    $("storyViewer");

  if (!viewer) return;

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
        #5b4bff,
        #f04c9b
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

        <h2>
          ${escapeHTML(
            story.name
          )}
        </h2>

        <p>
          ZUZII Story
        </p>

      </div>

    </div>

  `;

  viewer.classList.remove(
    "hidden"
  );

  const progress =
    document.querySelector(
      ".progress-line"
    );

  if (progress) {

    progress.style.transition =
      "none";

    progress.style.width =
      "0%";

    setTimeout(() => {

      progress.style.transition =
        "width 5s linear";

      progress.style.width =
        "100%";

    }, 50);

  }

}


/* =========================================================
   26. STORY BUTTONS
   ========================================================= */

window.openAllStories =
  function () {

    showToast(
      "Stories opened ✨"
    );

  };


window.closeStoryViewer =
  function () {

    $("storyViewer")
      ?.classList.add(
        "hidden"
      );

  };


window.createStory =
  function () {

    showToast(
      "Story upload coming next 📸"
    );

  };


window.reactToStory =
  function (emoji) {

    showToast(
      `${emoji} Reaction sent`
    );

  };


window.replyToStory =
  function () {

    const input =
      $("storyReplyInput");

    if (!input) return;

    if (!input.value.trim())
      return;

    input.value = "";

    showToast(
      "Story reply sent 💬"
    );

  };


/* =========================================================
   27. ATTACHMENTS
   ========================================================= */

window.openAttachmentMenu =
  function () {

    $("attachmentMenu")
      ?.classList.toggle(
        "hidden"
      );

  };


window.selectPhoto =
  function () {

    $("photoInput")?.click();

  };


window.selectVideo =
  function () {

    $("videoInput")?.click();

  };


window.selectDocument =
  function () {

    $("documentInput")?.click();

  };


window.selectCamera =
  function () {

    showToast(
      "Camera coming next 📷"
    );

  };


window.handlePhoto =
  function (event) {

    const file =
      event.target.files?.[0];

    if (!file) return;

    showToast(
      `${file.name} selected 📸`
    );

  };


window.handleVideo =
  function (event) {

    const file =
      event.target.files?.[0];

    if (!file) return;

    showToast(
      `${file.name} selected 🎥`
    );

  };


window.handleDocument =
  function (event) {

    const file =
      event.target.files?.[0];

    if (!file) return;

    showToast(
      `${file.name} selected 📄`
    );

  };


/* =========================================================
   28. EMOJI
   ========================================================= */

window.toggleEmojiPicker =
  function () {

    const input =
      $("messageInput");

    if (!input) return;

    input.value += "😊";

    input.focus();

  };


/* =========================================================
   29. VOICE
   ========================================================= */

window.startVoiceRecording =
  function () {

    showToast(
      "Voice recording coming next 🎙️"
    );

  };


/* =========================================================
   30. CALLS
   ========================================================= */

window.startVoiceCall =
  function () {

    showToast(
      "Voice call coming next 📞"
    );

  };


window.startVideoCall =
  function () {

    showToast(
      "Video call coming next 📹"
    );

  };


/* =========================================================
   31. OTHER BUTTONS
   ========================================================= */

window.openSettings =
  function () {

    showToast(
      "Settings coming next ⚙️"
    );

  };


window.openChatInfo =
  function () {

    showToast(
      "Chat information coming next ℹ️"
    );

  };


/* =========================================================
   32. LOGOUT
   ========================================================= */

window.logoutUser =
  async function () {

    try {

      await signOut(auth);

      showToast(
        "Logged out 👋"
      );

    } catch (error) {

      console.error(error);

      showToast(
        "Logout failed."
      );

    }

  };


/* =========================================================
   ZUZII READY
   ========================================================= */

console.log(
  "✨ ZUZII Firebase initialized successfully"
);
