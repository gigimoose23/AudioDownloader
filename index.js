const { app, BrowserWindow, Menu, nativeTheme, ipcMain, dialog } = require('electron');
const fs = require("fs");
const axios = require("axios");
const { createWriteStream } = require("fs");
const path = require('node:path');


async function validateCookie(cookie) {
    const res = await fetch("https://apis.roblox.com/credit-balance/v1/get-credit-balance-for-navigation", {
        headers: {
            "Content-Type": "application/json",
            "cookie": ".ROBLOSECURITY=" + cookie
        },
    });
    console.log(res);
    return res.ok;
}

async function downloadAsset(id, cookie, place) {
    try {
        const assetNameRes = await fetch("https://apis.roblox.com/toolbox-service/v1/items/details?assetIds=" + id)
        const assetNameJs = await assetNameRes.json()
    
        const assetName = assetNameJs.data[0].asset.name
        console.log(assetName)
        const res = await axios({
            url: `https://assetdelivery.roblox.com/v1/asset?id=${id}`,
            headers: {
                "Content-Type": "application/json",
                "Roblox-Place-Id": Number(place),
                "User-Agent": "Roblox/WinInet",
                "cookie": ".ROBLOSECURITY=" + cookie
            },
            responseType: 'stream',
            onDownloadProgress: (progressEvent) => {
                const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                if (percentage === 100) {
                    console.log("Finished");
                }
            },
        });

        if (res.status === 200) {
            const options = {
                defaultPath: path.join(app.getPath('downloads'), `${assetName}.ogg`),
                title: "Save Asset",
                buttonLabel: "Save",
                filters: [{ name: 'Audio', extensions: ['ogg'] }],
            };
            
            const savePath = dialog.showSaveDialogSync(null, options);

            if (!savePath) {
                console.log("No path selected");
                return "noPath";
            }

            const fileStream = createWriteStream(savePath);
            res.data.pipe(fileStream);

            await new Promise((resolve, reject) => {
                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
            });
            
            return assetName
        } else {
            return "no";
        }
    } catch (error) {
        console.error("Download failed:", error);
        return "no";
    }
}

async function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'icon.ico'),
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"),
            nativeWindowOpen: true
        }
    });

    win.setResizable(false);
    win.setMinimizable(false);

    function sendMessageToClient(msg, msgT) {
        win.webContents.send("showNotif", [msg, msgT]);
    }

    function allowBtn(mode) {
        win.webContents.send("allowBtn", mode);
    }

    ipcMain.on('download', async (event, args) => {
        console.log("downloading");
        const { cookie, place, id: asset } = args;
        allowBtn(false);

        const goodCookie = await validateCookie(cookie);
        if (goodCookie) {
            console.log("req continue");
            const downloadStatus = await downloadAsset(asset, cookie, place);
                
            if (downloadStatus === "no") {
                sendMessageToClient("Cookie was correct but you might've entered the wrong place or asset ID.", "error");
                allowBtn(true);
            } else {
                if (downloadStatus == "noPath") {
                    sendMessageToClient("Dialog cancelled" , "error");
                allowBtn(true);
                }
                else {
                    sendMessageToClient("Downloaded asset " + downloadStatus + " successfully", "success");
                allowBtn(true);
                console.log("Download succeeded.");
                }
                
            }
        } else {
            sendMessageToClient("Your cookie was invalid. Make sure there are no whitespaces.", "error");
            allowBtn(true);
        }
    });

    win.loadFile('render.html');
    win.on('ready-to-show', function() {
        setTimeout(() => {
            win.show();
            win.focus();
        }, 500);
    });


}

app.whenReady().then(() => {
    createWindow();
    Menu.setApplicationMenu(null);
    nativeTheme.themeSource = "dark";

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
