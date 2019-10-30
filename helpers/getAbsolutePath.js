module.exports=(base, relative)=>{
    var stack = base.split("/"),
    parts = relative.split("/");
    stack.pop();
    for (var i=0; i<parts.length; i++) {
        if (parts[i] == ".")
            continue;
        if (parts[i] == "..")
            stack.pop();
        else
            stack.push(parts[i]);
    }
    return stack.join("/");
}