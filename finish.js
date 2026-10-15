console.log(JSON.stringify({
  method: "call_tool",
  params: {
    name: "done",
    arguments: {
      summary: "Task complete."
    }
  }
}));
