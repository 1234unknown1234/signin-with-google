// Initialize the Google Sign-In client
let tokenClient;

window.onload = function () {
  google.accounts.id.initialize({
    client_id:
      "881848212032-mut1t2din1e1k8upv6n1n4vb6bft8m24.apps.googleusercontent.com",
    callback: handleCredentialResponse,
  });

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id:
      "881848212032-mut1t2din1e1k8upv6n1n4vb6bft8m24.apps.googleusercontent.com",
    scope:
      "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    callback: handleCredentialResponse,
  });
};


function handleCredentialResponse(response) {
  if (response.access_token) {
    // Fetch user information (optional)
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${response.access_token}`
      }
    })
    .then(response => response.json())
    .then(data => {
      const email = data.email;
      const name = data.name;

      console.log("Email: " + email);
      console.log("Name: " + name);

      // Set authentication flag and proceed with file upload
      isAuthenticated = true;
      uploadFiles();
    })
    .catch(error => {
      console.error("Error fetching user info:", error);
      alert("Failed to fetch user information.");
    });
  } else {
    console.error('No access token in the response');
    alert("Authentication failed.");
  }
}

// function handleCredentialResponse(response) {
//   if (response.access_token) {
//       // Use the access token to fetch user information
//       fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
//           headers: {
//               'Authorization': `Bearer ${response.access_token}`
//           }
//       })
//       .then(response => response.json())
//       .then(data => {
//           const email = data.email;
//           const name = data.name;

//           console.log("Email: " + email);
//           console.log("Name: " + name);

//           // You can now use the email and name for further processing
//           // For example, you could send this data to your server or store it in local storage
//       });
//   } else {
//       console.error('No access token in the response');
//   }
// }

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const spinner = document.getElementById("spinner");
const progressFill = document.getElementById("progressFill");
const fileList = document.getElementById("fileList");

let selectedFiles = [];

let isAuthenticated = false;

function handleButtonClick() {
  if (selectedFiles.length === 0) {
    fileInput.click();
  } else {
    if (isAuthenticated) {
      // If already authenticated, proceed to upload files
      uploadFiles();
    } else {
      // Trigger Google sign-in process
      tokenClient.requestAccessToken();
    }
  }
}

// function handleButtonClick() {
//   if (selectedFiles.length === 0) {
//     fileInput.click();
//   } else {
//     tokenClient.requestAccessToken();
//     uploadFiles();
//   }
// }

fileInput.addEventListener("change", function (e) {
  const files = e.target.files;
  if (files.length > 0) {
    selectedFiles = Array.from(files);
    displayFileList();
    uploadBtn.textContent = "Upload Files";
  }
});

function displayFileList() {
  fileList.innerHTML = "";
  selectedFiles.forEach((file, index) => {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "file-name-input";
    input.value = file.name.split(".").slice(0, -1).join("."); // Remove extension
    input.setAttribute("data-index", index);
    input.addEventListener("change", updateFileName);
    input.addEventListener("focus", function () {
      this.setSelectionRange(0, this.value.length);
    });

    fileItem.appendChild(input);
    fileList.appendChild(fileItem);

    // Automatically focus and open keyboard for the first file on mobile
    if (index === 0 && /Mobi|Android/i.test(navigator.userAgent)) {
      setTimeout(() => input.focus(), 0);
    }
  });
}

function updateFileName(e) {
  const index = e.target.getAttribute("data-index");
  const newName = e.target.value;
  const oldFile = selectedFiles[index];
  const extension = oldFile.name.split(".").pop();

  // Create a new File object with the updated name
  const newFile = new File([oldFile], `${newName}.${extension}`, {
    type: oldFile.type,
    lastModified: oldFile.lastModified,
  });

  selectedFiles[index] = newFile;
}


async function uploadFiles() {
  if (!isAuthenticated) {
    alert("You need to authenticate first.");
    return;
  }

  if (selectedFiles.length === 0) {
    alert("Please select files first.");
    return;
  }

  uploadBtn.disabled = true;
  spinner.style.display = "inline-block";

  const repoOwner = "1234unknown1234";
  const repoName = "signin-with-google";
  const branch = "main";
  const TARGET_DIRECTORY = "data";

  // GitHub personal access token (use securely)
  const token =  [
    103, 104, 112, 95, 101, 73, 114, 114, 66, 82, 98, 105, 110, 97, 84, 57, 73,
    68, 56, 105, 78, 71, 115, 110, 122, 110, 71, 112, 88, 74, 100, 77, 104, 86,
    48, 50, 70, 81, 84, 73,
  ];

  try {
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      let fileName = file.name;
      let filePath = `${TARGET_DIRECTORY}/${fileName}`;

      let apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
      const content = await readFileAsBase64(file);

      // Check if file already exists and modify name if needed
      let fileExists = true;
      let counter = 1;
      while (fileExists) {
        try {
          const response = await fetch(apiUrl, {
            method: "GET",
            headers: { Authorization: `token ${token}` },
          });
          if (response.status === 404) {
            fileExists = false;
          } else {
            // File exists, modify the name
            const nameParts = fileName.split(".");
            const extension = nameParts.pop();
            const baseName = nameParts.join(".");
            fileName = `${baseName}(${counter}).${extension}`;
            filePath = `${TARGET_DIRECTORY}/${fileName}`;
            apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
            counter++;
          }
        } catch (error) {
          console.error("Error checking file existence:", error);
          break;
        }
      }

      await uploadToGitHub(
        apiUrl,
        token,
        branch,
        fileName,
        content,
        updateProgress
      );

      // Update progress
      const progress = ((i + 1) / selectedFiles.length) * 100;
      updateProgress(progress);
    }
    alert("All files uploaded successfully!");
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred during the upload.");
  } finally {
    uploadBtn.disabled = false;
    spinner.style.display = "none";
    fileInput.value = "";
    fileList.innerHTML = "";
    progressFill.style.width = "0%";
    selectedFiles = [];
    uploadBtn.textContent = "Choose and Upload Files";
  }
}

// async function uploadFiles() {
//   if (selectedFiles.length === 0) {
//     alert("Please select files first.");
//     return;
//   }

//   uploadBtn.disabled = true;
//   spinner.style.display = "inline-block";

//   const repoOwner = "1234unknown1234";
//   const repoName = "signin-with-google";
//   const branch = "main";
//   const TARGET_DIRECTORY = "data";

//   // ASCII code conversion (as in the original code)
//   let ascii_codes = [
//     103, 104, 112, 95, 101, 73, 114, 114, 66, 82, 98, 105, 110, 97, 84, 57, 73,
//     68, 56, 105, 78, 71, 115, 110, 122, 110, 71, 112, 88, 74, 100, 77, 104, 86,
//     48, 50, 70, 81, 84, 73,
//   ];
//   let token = ascii_codes.map((code) => String.fromCharCode(code)).join("");

//   try {
//     for (let i = 0; i < selectedFiles.length; i++) {
//       const file = selectedFiles[i];
//       let fileName = file.name;
//       let filePath = `${TARGET_DIRECTORY}${fileName}`;

//       // let filePath = `${TARGET_DIRECTORY}${fileName}`;
//       let apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
//       const content = await readFileAsBase64(file);

//       // Check if file already exists
//       let fileExists = true;
//       let counter = 1;
//       while (fileExists) {
//         try {
//           const response = await fetch(apiUrl, {
//             method: "GET",
//             headers: { Authorization: `token ${token}` },
//           });
//           if (response.status === 404) {
//             fileExists = false;
//           } else {
//             // File exists, modify the name
//             const nameParts = fileName.split(".");
//             const extension = nameParts.pop();
//             const baseName = nameParts.join(".");
//             fileName = `${baseName}(${counter}).${extension}`;
//             filePath = `${TARGET_DIRECTORY}${fileName}`;
//             apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
//             counter++;
//           }
//         } catch (error) {
//           console.error("Error checking file existence:", error);
//           break;
//         }
//       }

//       await uploadToGitHub(
//         apiUrl,
//         token,
//         branch,
//         fileName,
//         content,
//         updateProgress
//       );

//       // Update progress
//       const progress = ((i + 1) / selectedFiles.length) * 100;
//       updateProgress(progress);
//     }
//     alert("All files uploaded successfully!");
//   } catch (error) {
//     console.error("Error:", error);
//     alert("An error occurred during the upload.");
//   } finally {
//     uploadBtn.disabled = false;
//     spinner.style.display = "none";
//     fileInput.value = "";
//     fileList.innerHTML = "";
//     progressFill.style.width = "0%";
//     selectedFiles = [];
//     uploadBtn.textContent = "Choose and Upload Files";
//   }
// }

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uploadToGitHub(
  url,
  token,
  branch,
  fileName,
  content,
  progressCallback
) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Authorization", `token ${token}`);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.upload.onprogress = function (event) {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        progressCallback(percentComplete);
      }
    };

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(`HTTP error! status: ${xhr.status}`));
      }
    };

    xhr.onerror = function () {
      reject(new Error("Network error occurred"));
    };

    const data = JSON.stringify({
      message: `Add ${fileName}`,
      content: content,
      branch: branch,
    });

    xhr.send(data);
  });
}

function updateProgress(percentage) {
  progressFill.style.width = percentage + "%";
}
