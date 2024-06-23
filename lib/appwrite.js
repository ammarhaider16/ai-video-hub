import { Client, Account, ID, Avatars, Databases, Query, Storage } from "react-native-appwrite";

export const config = {
  endpoint: "https://cloud.appwrite.io/v1",
  platform: "com.jsm.aora",
  projectID: "6660f2460009114db2f9",
  databaseID: "6660f35f002ceb04330a",
  userCollectionID: "6660f378000582a53948",
  videoCollectionID: "6660f3990039c054de47",
  storageID: "6660f53d0038d6059a43",
};

const {
  endpoint,
  platform,
  projectID,
  databaseID,
  userCollectionID,
  videoCollectionID,
  storageID,
} = config;

// Init your React Native SDK
const client = new Client();
client
  .setEndpoint(config.endpoint) // Your Appwrite Endpoint
  .setProject(config.projectID) // Your project ID
  .setPlatform(config.platform); // Your application ID or bundle ID.

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);
const storage = new Storage(client)

export const createUser = async (email, password, username) => {
  try {
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username
    );
    if (!newAccount) throw Error;
    const avatarURL = avatars.getInitials(username);

    await signIn(email, password);

    const newUser = await databases.createDocument(
      config.databaseID,
      config.userCollectionID,
      ID.unique(),
      {
        accountid: newAccount.$id,
        email,
        username,
        avatar: avatarURL
      }
    );

  } catch (error) {
    console.log(error);
  }
};

export const signIn = async (email, password) => {
  try {
    const session = await account.createEmailPasswordSession(email, password);
  } catch (error) {
    console.log(error)
  }
}

export const signOut = async () => {
  try {
    const session = await account.deleteSession('current');
  } catch (error) {
    console.log(error)
  }
}

export const getCurrrentUser = async () => {
    try {
        const currentAccount = await account.get();

        if (!currentAccount) throw Error;

        const currentUser = await databases.listDocuments(
            config.databaseID,
            config.userCollectionID,
            [Query.equal('accountid',currentAccount.$id)]
        );

        if (!currentUser) throw Error;

        return currentUser.documents[0];



    } catch (err) {
        console.log(err)
    }
}


export async function getAllPosts() {
  try {
    const posts = await databases.listDocuments(
      config.databaseID,
      config.videoCollectionID
    );

    return posts.documents;
  } catch (error) {
    console.log(error);
  }
}


export async function getLatestPosts() {
  try {
    const posts = await databases.listDocuments(
      config.databaseID,
      config.videoCollectionID,
      [Query.orderDesc('$createdAt', Query.limit(7))]
    );

    return posts.documents;
  } catch (error) {
    console.log(error);
  }
}


export async function searchPosts(query) {
  try {
    const posts = await databases.listDocuments(
      config.databaseID,
      config.videoCollectionID,
      [Query.search("title", query)]
    );

    if (!posts) throw new Error("Something went wrong");

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

export async function getUserPosts(userID) {
  try {
    const posts = await databases.listDocuments(
      config.databaseID,
      config.videoCollectionID,
      [Query.equal("creator", userID)]
    );

    if (!posts) throw new Error("Something went wrong");

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

export async function createVideoPost(form) {
  try {
    const [thumbnailUrl, videoUrl] = await Promise.all([
      uploadFile(form.thumbnail, "image"),
      uploadFile(form.video, "video"),
    ]);

    const newPost = await databases.createDocument(
      config.databaseID,
      config.videoCollectionID,
      ID.unique(),
      {
        title: form.title,
        thumbnail: thumbnailUrl,
        video: videoUrl,
        prompt: form.prompt,
        creator: form.userId,
      }
    );

    return newPost;
  } catch (error) {
    throw new Error(error);
  }
}


export async function uploadFile(file, type) {
  if (!file) return;

  const { mimeType, ...rest } = file;
  const asset = { type: mimeType, ...rest };

  try {
    const uploadedFile = await storage.createFile(
      config.storageID,
      ID.unique(),
      asset
    );

    const fileUrl = await getFilePreview(uploadedFile.$id, type);
    return fileUrl;
  } catch (error) {
    throw new Error(error);
  }
}

export async function getFilePreview(fileId, type) {
  let fileUrl;

  try {
    if (type === "video") {
      fileUrl = storage.getFileView(config.storageID, fileId);
    } else if (type === "image") {
      fileUrl = storage.getFilePreview(
        config.storageID,
        fileId,
        2000,
        2000,
        "top",
        100
      );
    } else {
      throw new Error("Invalid file type");
    }

    if (!fileUrl) throw Error;

    return fileUrl;
  } catch (error) {
    throw new Error(error);
  }
}
