const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ✅ 서울 리전(asia-northeast3)에 맞춰 배포
exports.sendChatNotification = functions
    .region("asia-northeast3")
    .firestore.document("chatRooms/{roomId}/messages/{messageId}")
    .onCreate(async (snapshot, context) => {
      const messageData = snapshot.data();
      const roomId = context.params.roomId;

      const senderId = messageData.senderId;
      const receiverId = messageData.receiverId;
      const text = messageData.text || "새 메시지가 도착했어요!";

      if (!receiverId) {
        console.log("🚫 receiverId 없음, 푸시 중단");
        return null;
      }

      try {
      // 🔹 발신자 닉네임 가져오기
        const senderDoc = await db
            .collection("users")
            .doc(String(senderId))
            .get();
        const senderName = senderDoc.exists ?
        senderDoc.data().name || "상대방" :
        "상대방";

        // 🔹 수신자 fcmToken 가져오기
        const receiverDoc = await db
            .collection("users")
            .doc(String(receiverId))
            .get();
        const targetToken = receiverDoc.data()?.fcmToken;

        if (!targetToken) {
          console.log("🚫 FCM 토큰 없음:", receiverId);
          return null;
        }

        // 🔹 푸시 알림 payload
        const payload = {
          notification: {
            title: `${senderName}님의 메시지`,
            body: text,
          },
          data: {
            roomId: roomId,
            senderId: String(senderId),
            receiverId: String(receiverId),
            type: "chat",
          },
        };

        await admin.messaging().sendToDevice(targetToken, payload);
        console.log("✅ 푸시 발송 성공:", receiverId);
      } catch (err) {
        console.error("❌ 푸시 발송 실패:", err);
      }

      return null;
    });
