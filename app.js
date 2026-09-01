/* =========================================================
   ZUZII APP.JS
   Firebase Authentication + Firestore
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
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   FIREBASE CONFIG
   ========================================================= */

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
   INITIALIZE
   ========================================================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentChatUser = null;
let currentChatId = null;

let unsubscribeMessages = null;
let unsubscribeChats = null;


/* =========================================================
   HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

function toast(message) {

  const toastBox = $("toast");
  const toastText = $("toastMessage");

  if (!toastBox || !toastText) {
    alert(message);
    return;
  }

  toastText.textContent = message;

  toastBox.classList.remove("hidden");

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toastBox.classList.add("hidden");
  }, 2500);
}


function message(text, success = false) {

  const box = $("authMessage");

  if (!box) return;

  box.textContent = text;

  box.style.color =
    success ? "#4ee3a5" : "#ff7a9d";
}


function initial(name) {

  return (name || "U")
    .trim()
    .charAt(0)
    .toUpperCase();
}


function escapeHTML(value) {

  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function time(timestamp) {

  if (!timestamp) return "now";

  try {

    const date =
      timestamp.toDate
        ? timestamp.toDate()
        : new Date(timestamp);

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

  } catch {

    return "now";
  }
}


function firebaseError(error) {

  console.error("Firebase:", error);

  switch (error.code) {

    case "auth/invalid-credential":
      return "Email or password is incorrect.";

    case "auth/invalid-login-credentials":
      return "Email or password is incorrect.";

    case "auth/user-not-found":
      return "Account not found.";

    case "auth/wrong-password":
      return "Wrong password.";

    case "auth/email-already-in-use":
      return "Email already registered.";

    case "auth/invalid-email":
      return "Enter a valid email.";

    case "auth/weak-password":
      return "Password must contain at least 6 characters.";

    case "auth/network-request-failed":
      return "Network error. Check internet.";

    case "auth/operation-not-allowed":
      return "Email login is disabled in Firebase.";

    default:
      return error.message || "Something went wrong.";
  }
}


/* =========================================================
   LOGIN / SIGNUP SCREEN
   ========================================================= */

window.showSignup = function () {

  $("loginForm").classList.add("hidden");

  $("signupForm").classList.remove("hidden");

  message("");
};


window.showLogin = function () {

  $("signupForm").classList.add("hidden");

  $("loginForm").classList.remove("hidden");

  message("");
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
   SIGN UP
   ========================================================= */

window.signupUser = async function () {

  const name =
    $("signupName").value.trim();

  const username =
    $("signupUsername").value.trim().toLowerCase();

  const email =
    $("signupEmail").value.trim();

  const password =
    $("signupPassword").value;

  if (!name || !username || !email || !password) {

    message("Please fill all fields.");

    return;
  }

  if (username.length < 3) {

    message("Username must contain at least 3 characters.");

    return;
  }

  if (password.length < 6) {

    message("Password must contain at least 6 characters.");

    return;
  }


  try {

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
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp()
      }
    );


    toast("Welcome to ZUZII ✨");

  } catch (error) {

    message(firebaseError(error));

  }

};


/* =========================================================
   LOGIN
   ========================================================= */

window.loginUser = async function () {

  const email =
    $("emailInput").value.trim();

  const password =
    $("passwordInput").value;


  if (!email || !password) {

    message("Enter email and password.");

    return;
  }


  try {

    const button = $("loginBtn");

    if (button) {

      button.disabled = true;
      button.innerHTML =
        `<span>Signing in...</span>`;
    }


    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );


    toast("Welcome back 👋");


  } catch (error) {

    message(firebaseError(error));

  } finally {

    const button = $("loginBtn");

    if (button) {

      button.disabled = false;

      button.innerHTML = `
        <span>Continue</span>
        <i class="fa-solid fa-arrow-right"></i>
      `;
    }

  }

};


/* =========================================================
   AUTH STATE
   ========================================================= */

onAuthStateChanged(auth, async (user) => {

  console.log("AUTH STATE:", user);

  if (user) {

    currentUser = user;


    $("authScreen").classList.add("hidden");

    $("mainApp").classList.remove("hidden");


    await loadMyProfile();

    loadChats();

  } else {

    currentUser = null;


    $("authScreen").classList.remove("hidden");

    $("mainApp").classList.add("hidden");


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
   MY PROFILE
   ========================================================= */

async function loadMyProfile() {

  if (!currentUser) return;


  try {

    const ref =
      doc(db, "users", currentUser.uid);

    const snap =
      await getDoc(ref);


    if (snap.exists()) {

      const data = snap.data();


      $("myName").textContent =
        data.name ||
        currentUser.displayName ||
        "User";


      $("myAvatar").textContent =
        initial(data.name);

    } else {

      $("myName").textContent =
        currentUser.displayName || "User";

      $("myAvatar").textContent =
        initial(currentUser.displayName);

    }

  } catch (error) {

    console.error(error);

  }

}


/* =========================================================
   CHAT ID
   ========================================================= */

function chatId(uid1, uid2) {

  return [uid1, uid2]
    .sort()
    .join("_");

}


/* =========================================================
   NEW CHAT
   ========================================================= */

window.openNewChat = function () {

  $("newChatModal")
    .classList.remove("hidden");

  $("userSearch").value = "";

  $("userSearchResults").innerHTML = "";

};


window.closeNewChat = function () {

  $("newChatModal")
    .classList.add("hidden");

};


/* =========================================================
   SEARCH USERS
   ========================================================= */

window.searchUsers = async function () {

  const text =
    $("userSearch")
      .value
      .trim()
      .toLowerCase();


  const results =
    $("userSearchResults");


  if (!text) {

    results.innerHTML = "";

    return;
  }


  try {

    const usersSnap =
      await onetimeUsers();


    results.innerHTML = "";

    let found = 0;


    usersSnap.forEach((userDoc) => {

      const user = userDoc.data();


      if (
        user.uid !== currentUser.uid &&
        (
          (user.username || "")
            .toLowerCase()
            .includes(text) ||

          (user.name || "")
            .toLowerCase()
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
            ${initial(user.name)}
          </div>

          <div class="user-result-info">
            <strong>
              ${escapeHTML(user.name || "User")}
            </strong>

            <span>
              @${escapeHTML(user.username || "user")}
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
          <p>Try another username.</p>
        </div>
      `;

    }

  } catch (error) {

    console.error(error);

    toast("Could not search users.");

  }

};


async function onetimeUsers() {

  const { getDocs } =
    await import(
      "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js"
    );

  return getDocs(
    collection(db, "users")
  );
}


/* =========================================================
   START CHAT
   ========================================================= */

async function startChat(user) {

  if (!currentUser) return;


  currentChatUser = user;


  currentChatId =
    chatId(
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


    $("emptyChat")
      .classList.add("hidden");

    $("activeChat")
      .classList.remove("hidden");


    $("chatUserName").textContent =
      user.name || "User";


    $("chatUserStatus").textContent =
      user.status || "offline";


    $("chatAvatar").textContent =
      initial(user.name);


    $("mainApp")
      .classList.add("chat-open");


    loadMessages();

  } catch (error) {

    console.error(error);

    toast("Could not open chat.");

  }

}


/* =========================================================
   LOAD CHATS
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

        const list =
          $("chatList");


        list.innerHTML = "";


        if (snapshot.empty) {

          list.innerHTML = `
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


          renderChat(
            chatDoc.id,
            user,
            chat
          );

        }

      },
      (error) => {

        console.error(
          "Chat listener error:",
          error
        );

        toast("Firestore permission error.");

      }
    );

}


/* =========================================================
   RENDER CHAT
   ========================================================= */

function renderChat(chatIdValue, user, chat) {

  const list =
    $("chatList");


  const item =
    document.createElement("div");


  item.className =
    "chat-item";


  item.innerHTML = `

    <div class="avatar gradient-avatar">
      ${initial(user.name)}
    </div>

    <div class="chat-info">

      <div class="chat-top">

        <h4>
          ${escapeHTML(user.name || "User")}
        </h4>

        <span class="chat-time">
          ${time(chat.updatedAt)}
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


  list.appendChild(item);

}


/* =========================================================
   LOAD MESSAGES
   ========================================================= */

function loadMessages() {

  if (!currentChatId) return;


  const ref =
    collection(
      db,
      "chats",
      currentChatId,
      "messages"
    );


  const q =
    query(
      ref,
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
      (snapshot) => {

        const container =
          $("messagesContainer");


        container.innerHTML = "";


        snapshot.forEach(
          (messageDoc) => {

            renderMessage(
              messageDoc.data(),
              messageDoc.id
            );

          }
        );


        container.scrollTop =
          container.scrollHeight;

      },
      (error) => {

        console.error(
          "Message error:",
          error
        );

      }
    );

}


/* =========================================================
   RENDER MESSAGE
   ========================================================= */

function renderMessage(
  data,
  messageId
) {

  const container =
    $("messagesContainer");


  const mine =
    data.senderId === currentUser.uid;


  const row =
    document.createElement("div");


  row.className =
    `message-row ${
      mine ? "sent" : "received"
    }`;


  const bubble =
    document.createElement("div");


  bubble.className =
    "message-bubble";


  bubble.innerHTML = `

    <div>
      ${escapeHTML(data.text)}
    </div>

    <div class="message-meta">

      <span>
        ${time(data.createdAt)}
      </span>

      ${
        mine
          ? `<span class="read-tick">✓✓</span>`
          : ""
      }

    </div>

  `;


  row.appendChild(bubble);

  container.appendChild(row);

}


/* =========================================================
   SEND MESSAGE
   ========================================================= */

window.sendMessage = async function () {

  if (
    !currentUser ||
    !currentChatId ||
    !currentChatUser
  ) {

    toast("Select a chat first.");

    return;
  }


  const input =
    $("messageInput");


  const text =
    input.value.trim();


  if (!text) return;


  try {

    input.value = "";


    await addDoc(
      collection(
        db,
        "chats",
        currentChatId,
        "messages"
      ),
      {
        senderId: currentUser.uid,
        receiverId: currentChatUser.uid,
        text: text,
        type: "text",
        createdAt: serverTimestamp()
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
        updatedAt: serverTimestamp()
      },
      {
        merge: true
      }
    );


  } catch (error) {

    console.error(error);

    toast("Message failed.");

  }

};


/* =========================================================
   ENTER SEND
   ========================================================= */

window.handleMessageKey = function(event) {

  if (
    event.key === "Enter" &&
    !event.shiftKey
  ) {

    event.preventDefault();

    window.sendMessage();

  }

};


/* =========================================================
   SEARCH CHATS
   ========================================================= */

window.searchChats = function () {

  const value =
    $("chatSearch")
      .value
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
   CLOSE CHAT
   ========================================================= */

window.closeChat = function () {

  $("mainApp")
    .classList.remove("chat-open");

};


/* =========================================================
   LOGOUT
   ========================================================= */

window.logoutUser = async function () {

  try {

    await signOut(auth);

    toast("Logged out");

  } catch (error) {

    console.error(error);

  }

};


/* =========================================================
   OTHER UI
   ========================================================= */

window.openSettings = function () {
  toast("Settings coming soon ⚙️");
};


window.openChatInfo = function () {
  toast("Chat information coming soon");
};


window.startVoiceCall = function () {
  toast("Voice call coming soon 📞");
};


window.startVideoCall = function () {
  toast("Video call coming soon 📹");
};


window.startVoiceRecording = function () {
  toast("Voice recording coming soon 🎙️");
};


window.toggleEmojiPicker = function () {

  const input =
    $("messageInput");

  input.value += "😊";

  input.focus();

};


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
  toast("Camera coming soon 📷");
};


window.handlePhoto = function(e) {

  if (e.target.files[0]) {
    toast(e.target.files[0].name);
  }

};


window.handleVideo = function(e) {

  if (e.target.files[0]) {
    toast(e.target.files[0].name);
  }

};


window.handleDocument = function(e) {

  if (e.target.files[0]) {
    toast(e.target.files[0].name);
  }

};


window.openAllStories = function () {
  toast("Stories coming soon ✨");
};


window.createStory = function () {
  toast("Story upload coming soon 📸");
};


window.reactToStory = function(emoji) {
  toast(`${emoji} Reaction sent`);
};


window.replyToStory = function() {

  const input =
    $("storyReplyInput");

  if (!input.value.trim()) return;

  input.value = "";

  toast("Story reply sent");

};


window.closeStoryViewer = function() {

  $("storyViewer")
    .classList.add("hidden");

};


/* =========================================================
   READY
   ========================================================= */

console.log(
  "✨ ZUZII Firebase initialized successfully"
);
