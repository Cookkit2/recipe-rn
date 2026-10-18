beforeEach(async () => {
  await device.launchApp({
    newInstance: true,
    delete: true,
    permissions: {
      notifications: "YES",
      camera: "YES",
      photos: "YES",
      microphone: "YES",
    },
  });
});
