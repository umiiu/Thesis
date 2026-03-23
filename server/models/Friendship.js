const mongoose = require('mongoose');

const FriendshipSchema = new mongoose.Schema({
    // Người gửi lời mời
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Người nhận lời mời
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Trạng thái: pending, accepted, declined, blocked
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'blocked'],
        default: 'pending',
        index: true
    },
    // Thời gian tạo
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    // Thời gian cập nhật (chấp nhận/từ chối)
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound indexes để query nhanh
FriendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
FriendshipSchema.index({ requester: 1, status: 1 });
FriendshipSchema.index({ recipient: 1, status: 1 });

// ==================== HELPER: Convert to ObjectId ====================
function toObjectId(id) {
    if (!id) throw new Error('ID is required');
    if (mongoose.Types.ObjectId.isValid(id)) {
        return new mongoose.Types.ObjectId(id);
    }
    throw new Error('Invalid ObjectId format');
}

// ==================== STATIC METHODS ====================

// Gửi lời mời kết bạn
FriendshipSchema.statics.sendRequest = async function (requesterId, recipientId) {
    // ✅ Convert to ObjectId
    const requesterObjId = toObjectId(requesterId);
    const recipientObjId = toObjectId(recipientId);

    // Kiểm tra xem đã có friendship chưa
    const existing = await this.findOne({
        $or: [
            { requester: requesterObjId, recipient: recipientObjId },
            { requester: recipientObjId, recipient: requesterObjId }
        ]
    });

    if (existing) {
        if (existing.status === 'accepted') {
            throw new Error('Already friends');
        }
        if (existing.status === 'pending') {
            throw new Error('Friend request already sent');
        }
        if (existing.status === 'blocked') {
            throw new Error('Cannot send friend request');
        }
        // Nếu declined, cho phép gửi lại
        existing.status = 'pending';
        existing.requester = requesterObjId;
        existing.recipient = recipientObjId;
        existing.updatedAt = new Date();
        return await existing.save();
    }

    // Tạo mới
    const friendship = new this({
        requester: requesterObjId,
        recipient: recipientObjId,
        status: 'pending'
    });

    return await friendship.save();
};

// Chấp nhận lời mời
FriendshipSchema.statics.acceptRequest = async function (requesterId, recipientId) {
    const requesterObjId = toObjectId(requesterId);
    const recipientObjId = toObjectId(recipientId);

    const friendship = await this.findOne({
        requester: requesterObjId,
        recipient: recipientObjId,
        status: 'pending'
    });

    if (!friendship) {
        throw new Error('Friend request not found');
    }

    friendship.status = 'accepted';
    friendship.updatedAt = new Date();
    return await friendship.save();
};

// Từ chối lời mời
FriendshipSchema.statics.declineRequest = async function (requesterId, recipientId) {
    const requesterObjId = toObjectId(requesterId);
    const recipientObjId = toObjectId(recipientId);

    const friendship = await this.findOne({
        requester: requesterObjId,
        recipient: recipientObjId,
        status: 'pending'
    });

    if (!friendship) {
        throw new Error('Friend request not found');
    }

    friendship.status = 'declined';
    friendship.updatedAt = new Date();
    return await friendship.save();
};

// Hủy lời mời đã gửi
FriendshipSchema.statics.cancelRequest = async function (requesterId, recipientId) {
    const requesterObjId = toObjectId(requesterId);
    const recipientObjId = toObjectId(recipientId);

    const result = await this.deleteOne({
        requester: requesterObjId,
        recipient: recipientObjId,
        status: 'pending'
    });

    if (result.deletedCount === 0) {
        throw new Error('Friend request not found');
    }

    return result;
};

// Unfriend (hủy kết bạn)
FriendshipSchema.statics.removeFriend = async function (userId1, userId2) {
    const user1ObjId = toObjectId(userId1);
    const user2ObjId = toObjectId(userId2);

    const result = await this.deleteOne({
        $or: [
            { requester: user1ObjId, recipient: user2ObjId, status: 'accepted' },
            { requester: user2ObjId, recipient: user1ObjId, status: 'accepted' }
        ]
    });

    if (result.deletedCount === 0) {
        throw new Error('Friendship not found');
    }

    return result;
};

// Lấy danh sách bạn bè
FriendshipSchema.statics.getFriends = async function (userId) {
    const userObjId = toObjectId(userId);

    const friendships = await this.find({
        $or: [
            { requester: userObjId, status: 'accepted' },
            { recipient: userObjId, status: 'accepted' }
        ]
    })
        .populate('requester', 'name email avatar status lastSeen publicKey')
        .populate('recipient', 'name email avatar status lastSeen publicKey')
        .sort({ updatedAt: -1 });

    // Trả về danh sách user (không phải current user)
    return friendships.map(f => {
        const friend = f.requester._id.toString() === userId.toString()
            ? f.recipient
            : f.requester;

        const friendObj = friend.toObject();
        return {
            id: friendObj._id.toString(), // ✅ Convert _id to string
            name: friendObj.name,
            email: friendObj.email,
            avatar: friendObj.avatar,
            status: friendObj.status,
            lastSeen: friendObj.lastSeen,
            publicKey: friendObj.publicKey,
            friendshipId: f._id,
            friendsSince: f.updatedAt
        };
    });
};

// Lấy lời mời đã nhận (pending requests TO me)
FriendshipSchema.statics.getReceivedRequests = async function (userId) {
    const userObjId = toObjectId(userId);

    const requests = await this.find({
        recipient: userObjId,
        status: 'pending'
    })
        .populate('requester', 'name email avatar status lastSeen publicKey')
        .sort({ createdAt: -1 });

    return requests.map(r => {
        const requesterObj = r.requester.toObject();
        return {
            id: requesterObj._id.toString(), // ✅ Convert _id to string
            name: requesterObj.name,
            email: requesterObj.email,
            avatar: requesterObj.avatar,
            status: requesterObj.status,
            lastSeen: requesterObj.lastSeen,
            publicKey: requesterObj.publicKey,
            requestId: r._id,
            requestedAt: r.createdAt
        };
    });
};

// Lấy lời mời đã gửi (pending requests FROM me)
FriendshipSchema.statics.getSentRequests = async function (userId) {
    const userObjId = toObjectId(userId);

    const requests = await this.find({
        requester: userObjId,
        status: 'pending'
    })
        .populate('recipient', 'name email avatar status lastSeen publicKey')
        .sort({ createdAt: -1 });

    return requests.map(r => {
        const recipientObj = r.recipient.toObject();
        return {
            id: recipientObj._id.toString(), // ✅ Convert _id to string
            name: recipientObj.name,
            email: recipientObj.email,
            avatar: recipientObj.avatar,
            status: recipientObj.status,
            lastSeen: recipientObj.lastSeen,
            publicKey: recipientObj.publicKey,
            requestId: r._id,
            requestedAt: r.createdAt
        };
    });
};

// Kiểm tra trạng thái friendship giữa 2 user
FriendshipSchema.statics.getStatus = async function (userId1, userId2) {
    const user1ObjId = toObjectId(userId1);
    const user2ObjId = toObjectId(userId2);

    const friendship = await this.findOne({
        $or: [
            { requester: user1ObjId, recipient: user2ObjId },
            { requester: user2ObjId, recipient: user1ObjId }
        ]
    });

    if (!friendship) {
        return { status: 'none' };
    }

    // Xác định ai là requester
    const isRequester = friendship.requester.toString() === userId1.toString();

    return {
        status: friendship.status,
        isRequester,
        friendshipId: friendship._id,
        createdAt: friendship.createdAt,
        updatedAt: friendship.updatedAt
    };
};

// Đếm số lời mời pending
FriendshipSchema.statics.countPendingRequests = async function (userId) {
    const userObjId = toObjectId(userId);

    return await this.countDocuments({
        recipient: userObjId,
        status: 'pending'
    });
};

module.exports = mongoose.model('Friendship', FriendshipSchema);