$(function(){

    var akku = "111111111111111111111100";
    var storage = {};
    var jumpStorage = {};

    var opCodesWithArgument= ["LDC", "LDV", "STV", "LDIV", "STIV", "ADD", "AND", "OR", "XOR", "EQL", "JMP", "JMN", "LBL"];
    var opCodesWithoutArguments = ["HALT", "NOT", "RAR"];

    //when execute is clicked
    $("#execute").on("click", function(e){

        e.preventDefault();

        //clear the console to make sure only the newest execution is shown
        console.clear();

        var file = $("#code-file").prop("files")[0];

        if(file === undefined){
            console.error("No file chosen :/");
        }

        //read the file
        var reader = new FileReader();
        reader.onload = function(progressEvent){

            var lines = this.result.split('\n');
            //first go through and make sure every label is registered
            for(var i = 0; i < lines.length; i++){
                if(lines[i] !== ""){
                    var command = parseCommand(i, lines[i]);
                    if(command.command === "lbl"){
                        execute(command);
                    }
                }
            }

            // line by line

            for(var line = 0; line < lines.length; line++){
                printCommand(lines[line], line);

                //if the line isn't empty
                if(lines[line] !== ""){
                    //execute the command after parsing it
                    var command = parseCommand(line, lines[line]);
                    //Ignore the label commands, since they were already executed
                    if(command.command !== "lbl"){
                        var result = execute(command);

                        //if a jump command was just executed
                        if((command.command === "jmp" || command.command === "jmn") && result >= 0){
                            line = (result - 1); //go back to that line -> jump to that line //-1 so that the lbl line is read again
                        }
                        if(command.command === "halt"){
                            break;
                        }
                    }

                }
            }
        };

        reader.readAsText(file); //start reading the text
    });

    function parseCommand(line, command){
        //if not a string throw an error
        if(!(typeof command === "string")){
            throwError(line, command);
        }
        //split the command
        var parts = command.split(" ");

        //find out if its a correct opcode
        if(parts.length === 0){
            throwError(line, command);
        }
        //determine if its an valid operation
        if(opCodesWithArgument.indexOf(parts[0]) !== -1 && parts.length >= 2){
            return {
                command: parts[0].toLowerCase(),
                argument: parseArgument(parts[1]),
                line: line
            };
        }else if(opCodesWithoutArguments.indexOf(parts[0]) !== -1){
            return {
                command: parts[0].toLowerCase(),
                argument: "",
                line: line
            };
        }else{
            //if no valid operation, throw an error
            throwError(line, command);
            return {};
        }
    }

    function throwError(line, msg){
        console.error("Error at line: " + (line+1) + "  because of: " + msg);
        printCompleteStatus();
    }

    function parseArgument(argument){
        //fill up the arguments to make them twenty bits long
        return makeBit(argument, 20);
    }

    function makeBit(argument, length){
        //if its too small, add zeros infront
        if(argument.length < length){
            var temp = "";
            for(var i = 0; i < (length - argument.length); i++){
                temp += "0"; //prepend a zero
            }
            argument = temp + argument;
        }
        //if its too big, remove the first few bits
        if(argument.length > length){
            argument = argument.substring(argument.length - length,argument.length);
        }
        return argument;
    }

    function execute(command){
        //find the correct command and execute it
        return commands[command.command](command.line, command.argument);
    }

    //normal print
    function print(msg){
        console.log(msg);
    }
    //print for command
    function printCommand(msg, line){
        console.log("%c"+msg + " %c(" + line + ")", "color: #3f3f3f", "color: blue");
    }
    //print for status
    function printStatus(msg){
        console.log("%c" + msg, "color: blue");
    }

    function checkStorage(line, address){
        if(storage[address] === undefined){
            throwError(line, "storage at [" + address + "] is undefined");
        }
    }

    /* src: https://stackoverflow.com/questions/40353000/adding-two-binary-and-returning-binary-in-javascript */

    function halfAdder(a, b){
        const sum = xor(a,b);
        const carry = and(a,b);
        return [sum, carry];
    }
    function fullAdder(a, b, carry){
        halfAdd = halfAdder(a,b);
        const sum = xor(carry, halfAdd[0]);
        carry = and(carry, halfAdd[0]);
        carry = or(carry, halfAdd[1]);
        return [sum, carry];
    }
    function xor(a, b){return (a === b ? 0 : 1);}
    function and(a, b){return a == 1 && b == 1 ? 1 : 0;}
    function or(a, b){return (a || b);}
    function addBinary(a, b){

        var sum = '';
        var carry = '';

        for(var i = a.length-1;i>=0; i--){
            if(i == a.length-1){
                //half add the first pair
                const halfAdd1 = halfAdder(a[i],b[i]);
                sum = halfAdd1[0]+sum;
                carry = halfAdd1[1];
            }else{
                //full add the rest
                const fullAdd = fullAdder(a[i],b[i],carry);
                sum = fullAdd[0]+sum;
                carry = fullAdd[1];
            }
        }

        return carry ? carry + sum : sum;
    }
    /* end src: https://stackoverflow.com/questions/40353000/adding-two-binary-and-returning-binary-in-javascript */

    function binaryEqual(a, b){
        //compare the two binaries digit by digit
        for(var i = 0; i < a.length; i++){
            if(a.charAt(i) !== b.charAt(i)){
                return false;
            }
        }
        return true;
    }

    function getMinusOneInBinary(){
        //24 times the 1
        return "111111111111111111111111";
    }

    function printCompleteStatus(){
        printStatus("[Akku] " + akku + " = " + parseInt(akku, 2));
        console.table(storage); //storage as binary

        //convert the binary storage to decimal
        var temp = [];
        for (var property in storage) {
            if (storage.hasOwnProperty(property)) {
                temp.push({
                    "address": parseInt(property, 2),
                    "value": parseInt(storage[property], 2)
                });
            }
        }
        //sort based on address
        temp.sort(function(a,b){
           return a.address - b.address;
        });
        console.table(temp); //storage as decimal
    }

    /* All the different opcodes */
    var commands = {
        ldc: function (line, argument){
            akku = makeBit(argument, 24);
            printStatus("[Akku] " + akku);
        },
        stv: function(line, argument){
            storage[argument] = akku;
            printStatus("[Storage] Storage(" + argument + ") = " + akku);
        },
        halt: function(line){
            //prints the end status of the program
            printStatus("[HALT]");
            printCompleteStatus();
        },
        ldv: function(line, argument){
            checkStorage(line, argument);
            akku = storage[argument];
            printStatus("[Akku] " + akku);
        },
        add: function(line, argument){
            checkStorage(line, argument);
            printStatus("[ADD] " + akku + " (akku) + " + storage[argument] + " (storage)");
            akku = makeBit(addBinary(akku, storage[argument]), 24);
            printStatus("[Akku] " + akku);
        },
        ldiv: function(line, argument){
            checkStorage(line, argument);
            var tempAddress = makeBit(storage[argument], 20);
            printStatus("[Storage] Storage("+argument+") = "+tempAddress);
            checkStorage(line, tempAddress);
            akku = storage[tempAddress];
            printStatus("[Akku] " + akku);
        },
        stiv: function(line, argument){
            checkStorage(line, argument);
            var tempAddress = makeBit(storage[argument], 20);
            printStatus("[Storage] Storage("+argument+") = "+tempAddress);
            storage[tempAddress] = akku;
            printStatus("[Storage] Storage(" + tempAddress + ") = " + akku);
        },
        lbl: function(line, argument){
            jumpStorage[argument] = line;
            printStatus("[LBL] Created label (" + argument + ") at line " + line);
        },
        jmp: function(line, argument){
            var jumpTo = jumpStorage[argument];
            if(jumpTo === undefined){
                throwError(line, "jump label not defined: " + argument);
            }
            printStatus("[JMP] jumped to label: " + argument + " at line: " + jumpTo);
            return jumpTo;
        },
        jmn: function(line, argument){
            //if -1 is in the akku
            if(akku.charAt(0) === "1"){
                //jump to the label
                return this.jmp(line, argument);
            }else{
                printStatus("[JMN] Since Akku > 0, no jump");
            }
        },
        eql: function(line, argument){
            checkStorage(line, argument);
            var compareTo = storage[argument];

            if(binaryEqual(akku, compareTo)){
                printStatus("[EQL] are equal");
                akku = getMinusOneInBinary();
                printStatus("[Akku] " + akku);
                return true;
            }else{
                printStatus("[EQL] are not equal");
                akku = makeBit("0", 24);
                printStatus("[Akku] " + akku);
                return true;
            }

        },
        not: function(line, argument){
            var temp = "";
            //reverse each digit
            for(var i = 0; i < akku.length; i++){
                temp = temp + (akku.charAt(i) === "0"? "1" : "0");
            }
            akku = temp;
            printStatus("[Akku] " + akku);
        },
        rar: function(line, argument){
            akku = akku.charAt(akku.length-1) + akku.substr(0, akku.length-1); //remove the most right bit, and add a zero infront -> rotate 1 bit to the right
            printStatus("[Akku] " + akku);
        },
        and: function(line, argument){
            checkStorage(line, argument);
            var valueFromStorage = storage[argument];
            var temp = "";
            for(var i = 0; i < akku.length; i++){
                if(akku.charAt(i) === "1" && valueFromStorage.charAt(i) === "1"){
                    temp = temp + "1";
                }else{
                    temp = temp + "0";
                }
            }
            akku = temp;
            printStatus("[Akku] " + akku);
        },
        or: function(line, argument){
            checkStorage(line, argument);
            var valueFromStorage = storage[argument];
            var temp = "";
            for(var i = 0; i < akku.length; i++){
                if(akku.charAt(i) === "0" && valueFromStorage.charAt(i) === "0"){
                    temp = temp + "0";
                }else{
                    temp = temp + "1";
                }
            }
            akku = temp;
            printStatus("[Akku] " + akku);
        },
        xor: function(line, argument){
            checkStorage(line, argument);
            var valueFromStorage = storage[argument];
            var temp = "";
            for(var i = 0; i < akku.length; i++){
                if((akku.charAt(i) === "0" && valueFromStorage.charAt(i) === "0")
                    || (akku.charAt(i) === "1" && valueFromStorage.charAt(i) === "1")){
                    temp = temp + "0";
                }else{
                    temp = temp + "1";
                }
            }
            akku = temp;
            printStatus("[Akku] " + akku);
        }
    }
});