import constants from "./constants";
import produce from "immer";
import playBell from "../shared/sound/bell";


const initialState = {
    initLoading: true,
    messageListLoading: false,
    hasMoreMessageList: true,
    sending: false,
    scrollToBottom: false,
    findLoading: false,
    hasMoreConversation: true,
    getImageListLoading: false,
    getFileListLoading: false,
    error: null,
    record: null,
    messages: null,
    inputMesage: {
        images: [],
        text: "",
        files: [],
    },
    typing: {},
    imageList: [],
    fileList: [],
};

const messageReducer = (state = initialState, { type, payload }) =>
    produce(state, (draft) => {
        let currentUser, message;
        switch (type) {
            case constants.CHAT_CLEAR_DATA:
                draft.record = null;
                break;
            case constants.CHAT_SCROLL_TO_BOTTOM_TOGGLE:
                draft.scrollToBottom = !state.scrollToBottom;
                break;
            case constants.INPUT_MESSAGE_CHANGE:
                draft.inputMesage.text = payload;
                break;
            case constants.INPUT_IMAGE_LIST_CHANGE:
                draft.inputMesage.images = payload;
                break;
            case constants.INPUT_FILE_LIST_CHANGE:
                draft.inputMesage.files = payload;
                break;
            case constants.CHAT_CREATE_START:
                draft.sending = true;
                draft.error = null;
                break;
            case constants.CHAT_CREATE_SUCCESS:
                draft.sending = false;
                draft.error = null;
                break;
            case constants.CHAT_CREATE_ERROR:
                draft.sending = false;
                draft.error = payload;
                break;
            case constants.CHAT_FIND_START:
                draft.findLoading = true;
                draft.error = null;
                draft.typing = {};
                draft.sending = false;
                draft.hasMoreConversation = true;
                break;
            case constants.CHAT_FIND_SUCCESS:
                draft.findLoading = false;
                if (payload && payload.skip && payload.data) {
                    // N???u cu???c tr?? chuy???n l?? 0 => h???t data
                    if (payload.data.messages.length === 0) {
                        draft.hasMoreConversation = false;
                    } else {
                        draft.record.messages = payload.data.messages.concat(
                            state.record.messages
                        );
                    }
                } else {
                    if (payload && payload.data) {
                        draft.record = payload.data;
                    }
                }
                draft.error = null;
                break;
            case constants.CHAT_FIND_ERROR:
                draft.findLoading = false;
                draft.record = null;
                draft.hasMoreConversation = false;
                draft.error = payload;
                break;
            case constants.CHAT_GET_START:
                draft.messageListLoading = true;
                draft.hasMoreMessageList = true;
                draft.error = null;
                draft.typing = {};
                draft.sending = false;
                break;
            case constants.CHAT_GET_SUCCESS:
                draft.messageListLoading = false;
                if (payload.skip && payload.skip > 0) {
                    // N???u skip > 0 => Load more
                    if (payload.messages.length < 1) {
                        // N???u kh??ng c??n message list => hasMore = false
                        draft.hasMoreMessageList = false;
                    }
                    draft.messages = state.messages.concat(payload.messages);
                } else {
                    // Get messages list l???n ?????u ti??n
                    draft.messages = payload.messages;
                }
                draft.error = null;
                break;
            case constants.CHAT_GET_ERROR:
                draft.messageListLoading = false;
                draft.hasMoreMessageList = false;
                draft.error = payload;
                break;
            case constants.SOCKET_SENT_MESSAGE:
                currentUser = payload.currentUser;
                message = payload.message;
                // n???u current user l?? ng?????i nh???n tin nh???n
                // ho???c curent user kh??ng ph???i l?? ng?????i nh???n tin v??o group
                // th?? b???t ??m thanh th??ng b??o tin nh???n t???i
                if (
                    currentUser.id === message.receiver._id ||
                    (message.conversationType === "ChatGroup" &&
                        currentUser.id !== message.sender._id)
                ) {
                    // N???u tin nh???n ??ang m??? th?? ??m thanh nh???
                    if (
                        (state.record &&
                            state.record.receiver.id === message.sender._id &&
                            message.conversationType === "User") ||
                        (state.record && state.record.receiver.id ===
                            message.receiver._id &&
                            message.conversationType === "ChatGroup")
                    ) {
                        playBell("sent");
                    } else {
                        playBell("new-message");
                    }
                } else {
                    // ng?????i g???i tin nh???n
                    playBell("sent");
                }

                // N???u tin nh???n ??ang m??? th?? th??m v??o tin nh???n
                if (
                    (state.record &&
                        state.record.receiver.id === message.sender._id &&
                        currentUser.id === message.receiver._id) ||
                    (state.record &&
                        state.record.receiver.id === message.receiver._id &&
                        currentUser.id === message.sender._id)
                ) {
                    draft.record.messages.push(message);
                    draft.scrollToBottom = true;
                } else if (
                    state.record &&
                    state.record.receiver.id === message.receiver._id &&
                    state.record.conversationType === "ChatGroup"
                ) {
                    // chat group
                    draft.record.messages.push(message);
                    draft.scrollToBottom = true;
                }

                // T??m index c???a item hi???n t???i trong danh s??ch  mesages
                let receivedMessageIndex = "";
                if (message.conversationType === "ChatGroup") {
                    // X??? l?? chat group
                    receivedMessageIndex = state.messages.findIndex((item) => {
                        return message.receiver._id === item.receiver._id;
                    });
                } else if (message.conversationType === "User") {
                    // x??? l?? chat ri??ng t??
                    receivedMessageIndex = state.messages.findIndex((item) => {
                        return (
                            (message.sender._id === item.sender._id &&
                                message.receiver._id === item.receiver._id) ||
                            (message.sender._id === item.receiver._id &&
                                message.receiver._id === item.sender._id)
                        );
                    });
                }

                if (receivedMessageIndex === 0) {
                    // N???u tin nh???n hi???n t???i ???? n???m ?????u danh s??ch th?? thay ?????i tin nh???n cu???i c??ng
                    draft.messages[0].message = message.message;
                    draft.messages[0].type = message.type;
                    draft.messages[0].updatedAt = message.createdAt;
                } else if (receivedMessageIndex === -1) {
                    // N???u kh??ng c?? tin nh???n hi???n t???i trong danh s??ch th?? th??m v??o ?????u
                    draft.messages.unshift({
                        sender: message.sender,
                        receiver: message.receiver,
                        message: message.message,
                        type: message.type,
                        conversationType: message.conversationType,
                        updatedAt: message.createdAt,
                    });
                } else {
                    // N???u tin nh???n hi???n t???i trong danh s??ch th?? ????a l??n ?????u
                    let [removedMessge] = draft.messages.splice(
                        receivedMessageIndex,
                        1
                    );
                    draft.messages.unshift({
                        ...removedMessge,
                        message: message.message,
                        type: message.type,
                        updatedAt: message.createdAt,
                    });
                }
                break;
            case constants.SOCKET_CREATE_GROUP:
                draft.typing = {};
                draft.sending = false;

                if (draft.messages) {
                    draft.messages.unshift({
                        sender: {},
                        receiver: {
                            _id: payload.id,
                            name: payload.name,
                        },
                        message: "",
                        conversationType: "ChatGroup",
                        updatedAt: payload.updatedAt,
                    });
                }

                draft.error = null;
                break;
            case constants.SOCKET_TYPING_ON:
                if (state.record) {
                    if (
                        payload.conversationType === "ChatGroup" &&
                        payload.receiver.id === state.record.receiver.id
                    ) {
                        draft.typing.status = true;
                        draft.typing.info = payload.info;
                        draft.scrollToBottom = true;
                        playBell("typing");
                    } else if (
                        payload.conversationType === "User" &&
                        payload.info.id === state.record.receiver.id
                    ) {
                        draft.typing.status = true;
                        draft.typing.info = payload.info;
                        draft.scrollToBottom = true;
                        playBell("typing");
                    }
                }
                break;
            case constants.SOCKET_TYPING_OFF:
                if (state.record) {
                    if (
                        payload.conversationType === "ChatGroup" &&
                        payload.receiver.id === state.record.receiver.id
                    ) {
                        draft.typing = {};
                    } else if (
                        payload.conversationType === "User" &&
                        payload.info.id === state.record.receiver.id
                    ) {
                        draft.typing = {};
                    }
                }
                break;
            case constants.CHAT_GET_IMAGE_LIST_START:
                draft.getImageListLoading = true;
                break;
            case constants.CHAT_GET_IMAGE_LIST_SUCCESS:
                draft.getImageListLoading = false;
                let tempImages = payload.images.map((image) => {
                    return {
                        src: `${process.env.REACT_APP_STATIC_PHOTOS}/${image}`,
                    };
                });
                if (payload.skip) {
                    // N???u t???n t???i skip => xem th??m
                    draft.imageList = draft.imageList.concat(tempImages);
                } else {
                    draft.imageList = tempImages;
                }

                break;
            case constants.CHAT_GET_IMAGE_LIST_ERROR:
                draft.getImageListLoading = false;
                break;
            case constants.CHAT_GET_FILE_LIST_START:
                draft.getFileListLoading = true;
                break;
            case constants.CHAT_GET_FILE_LIST_SUCCESS:
                draft.getFileListLoading = false;
                if (payload.skip) {
                    // N???u t???n t???i skip => xem th??m
                    draft.fileList = draft.fileList.concat(payload.files);
                } else {
                    draft.fileList = payload.files;
                }
                break;
            case constants.CHAT_GET_FILE_LIST_ERROR:
                draft.getFileListLoading = false;
                break;

            case constants.CHAT_CREATE_GROUP_START:
                draft.findLoading = true;
                break;
            case constants.CHAT_CREATE_GROUP_SUCCESS:
                draft.findLoading = false;
                break;
            case constants.CHAT_CREATE_GROUP_ERROR:
                draft.findLoading = false;
                break;
            case constants.CHAT_GROUP_REMOVE_MEMBER_SUCCESS:
                draft.record.receiver.members = draft.record.receiver.members.filter(
                    (item) => item.id !== payload
                );
                break;
            case constants.CHAT_GROUP_LEAVE:
                draft.messages = draft.messages.filter(
                    (item) => item.receiver._id !== payload
                );
                draft.record = null;
                break;
            case constants.CHAT_GROUP_ADD_MEMBERS_SUCCESS:
                draft.record.receiver.members = draft.record.receiver.members.concat(
                    payload
                );
                break;
            case constants.CHAT_GROUP_CHANGE_AVATAR:
                draft.record.receiver.picture = payload.picture;
                state.messages.forEach((item, index) => {
                    if (item.receiver._id === payload.groupId) {
                        draft.messages[index].receiver.picture =
                            payload.picture;
                    }
                });
                break;
            case constants.CHAT_GROUP_UPDATE_SUCCESS:
                draft.updateChatGroupLoading = false;
                draft.record.receiver.name = payload.name;
                state.messages.forEach((item, index) => {
                    if (item.receiver._id === payload.id) {
                        draft.messages[index].receiver.name = payload.name;
                    }
                });
                break;
            default:
                break;
        }
    });

export default messageReducer;
