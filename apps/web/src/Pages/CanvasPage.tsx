import { useRef, useEffect, useState } from "react";
import { Eraser, ArrowLeft, ArrowRight } from "lucide-react";
import { io } from "socket.io-client"
import { v4 as uuidv4 } from 'uuid';

const CanvasPage = () => {

  type Points = {
    x: number,
    y: number
  }
  type Stroke = {
    initial: Points | null,
    intermediate: Points[],
    final: Points | null,
    color: string | null,
    width: number | null,
    id?: Number | string | null,
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isUDrawing = useRef(false)
  const isOpponentDrawing = useRef(false)
  const [bgColor, setbgColor] = useState("white")
  const [strokeSize, setstrokeSize] = useState(5)
  const [currentStroke, setcurrentStroke] = useState<Stroke>({
    initial: null,
    intermediate: [],
    final: null,
    color: null,
    width: null,
    id: null,
  })

  const localStrokeRef = useRef<Stroke>({
    initial: null,
    intermediate: [],
    final: null,
    color: null,
    width: null,   // <- add this
    id: null,
  })
  const remoteStrokeRef = useRef<Stroke>({
    initial: null,
    intermediate: [],
    final: null,
    color: null,
    width: null,   // <- and this
    id: null,
  })

  const activeIdref = useRef(null)
  const [strokeIndex, setstrokeIndex] = useState<Number>(-1)
  const [Histry, setHistry] = useState<Stroke[]>([])
  const dummyColor = ["red", "blue", "green", "yellow", "brown", "purple", "pink", "black"]
  const [isConnecting, setisConnecting] = useState<Boolean>(false)
  const [isConnected, setisConnected] = useState<Boolean>(false)
  const [socket, setSocket] = useState<any>()

  useEffect(() => {

    const socketinstance = io("http://localhost:3000", {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 3,
    })

    setisConnecting(true)

    socketinstance.on("connected", (data) => {
      setisConnected(true)
      setisConnecting(false)
      setSocket(socketinstance)
    })

    setSocket(socketinstance)


    return () => {
      socketinstance.off("connected")
      setisConnecting(false)
      setisConnected(false)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      return
    }

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = "black"
    ctx.lineWidth = strokeSize
    // canvas.style.cursor = "not-allowed";
    // will be shown when not user turn
    ctx.lineCap = "round"

    canvas.style.cursor = "crosshair";
  }, [])




  const isActiveRef = useRef(false)
  const isBlockedref = useRef(false)
  const bufferRef = useRef(0)

  const Thottler = (data: any) => {
    if (isActiveRef.current) {
      return
    }
    const bufferIndex = bufferRef.current
    const arrayLength = data.intermediate.length

    // console.log("buufer index:", bufferIndex, "length:", arrayLength)
    const duplicated = data.intermediate.slice(bufferIndex, arrayLength)
    const bufferLength2send = duplicated.length
    // console.log("sent length:", bufferLength2send)
    if (bufferLength2send == 0) {
      // console.log("not enough stores to emit")
      return
    }
    bufferRef.current = arrayLength

    isActiveRef.current = true
    setTimeout(() => {
      SendEventStream(duplicated)
      isActiveRef.current = false
    }, 65)
  }

  const StartEventStream = (data) => {
    const uuid = uuidv4()
    activeIdref.current = uuid
    socket.emit("start-stream", { data, uuid })
  }
  const SendEventStream = (data: any) => {
    if (isBlockedref.current) {
      return
    }
    socket.emit("send-stream", { data, id: activeIdref.current })
    console.log("event stream sent")
  }

  const EndEventStream = (data: any) => {
    data = currentStroke
    const bufferIndex = bufferRef.current
    const arrayLength = data.intermediate.length


    console.log("buufer index:", bufferIndex, "length:", arrayLength)
    const duplicated = data.intermediate.slice(bufferIndex, arrayLength)
    const bufferLength2send = duplicated.length
    console.log("sent length:", bufferLength2send)

    if (bufferLength2send == 0) {
      console.log("not enough stores to emit")
      return
    }
    bufferRef.current = arrayLength
    socket.emit("send-stream", { data: duplicated, id: activeIdref.current })
    isBlockedref.current = true
    socket.emit("end-stream", { data: data.final, id: activeIdref.current })
    console.log("event stream ended")
    activeIdref.current = null
  }

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (!isUDrawing.current) {
      isUDrawing.current = true
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.beginPath()
    const pos = getMousePos(e)
    ctx.moveTo(pos.x, pos.y)

    currentStroke.initial = { x: pos.x, y: pos.y }
    const color = ctx.strokeStyle
    const width = ctx.lineWidth
    const data = { color, width, inital: { x: pos.x, y: pos.y } }
    isBlockedref.current = false
    StartEventStream(data)
  }

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (isUDrawing.current) {
      isUDrawing.current = false
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const pos = getMousePos(e)

    ctx.moveTo(pos.x, pos.y)
    currentStroke.final = { x: pos.x, y: pos.y }
    const selected = ctx.strokeStyle
    const width = ctx.lineWidth
    currentStroke.width = width
    currentStroke.color = String(selected)
    ctx.closePath()
    setHistry((prev) => {
      const truncated = prev.slice(0, Number(strokeIndex) + 1)
      return [...truncated, currentStroke]
    })
    setstrokeIndex(() => Histry.length)
    // EmitStroker(currentStroke)
    const data = {
      final: currentStroke.final,
      color: currentStroke.color,
      width: currentStroke.width,
    }
    EndEventStream(data)
    setcurrentStroke({
      initial: null,
      intermediate: [],
      final: null,
      color: null,
      width: null
    })
    bufferRef.current = 0
  }


  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (!isUDrawing.current) {
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const res = getMousePos(e)
    ctx.lineTo(res.x, res.y)
    ctx.stroke()

    const pos = getMousePos(e)
    currentStroke.intermediate.push(pos)
    Thottler(currentStroke)
  }

  const HandelColorSelect = (color: string) => {
    if (isUDrawing.current) {
      isUDrawing.current = false
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    console.log("picked color:", color)

    ctx.strokeStyle = color
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.lineWidth = strokeSize
  }, [strokeSize])


  const HandelUndo = () => {
    let relativeIndex = strokeIndex
    console.log("inital strokeIndex before undo:", relativeIndex)
    console.log("Ready to Undo")
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    console.log("whole histry:", Histry)

    // console.log("objj", Histry)
    // console.log("Histry length:", strokeLengh)

    // console.log("stroke index:", strokeIndex)
    if (Number(relativeIndex) <= -1) {
      console.log("no index to undo")
      return
    }
    relativeIndex = Number(relativeIndex) - 1
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setstrokeIndex((prev) => Number(prev) - 1)
    Histry.forEach((item, i) => {
      if (i > Number(relativeIndex)) {
        console.log("blocked due to storeindex")
        return
      }
      const color = item.color
      const width = item.width
      ctx.beginPath()
      ctx.lineWidth = Number(width)
      ctx.strokeStyle = String(color)
      ctx.moveTo(item.initial?.x, item.initial.y)

      item.intermediate.forEach((position, j) => {
        ctx.lineTo(position.x, position.y)
      })
      ctx.lineTo(item.final.x, item.final?.y)
      ctx.stroke()
      ctx.closePath()
    })
    console.log("final strokeIndex after undo:", relativeIndex)
  }

  const HandleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setstrokeIndex(-1)
    activeIdref.current = null
  }


  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };


  const HandelRedo = () => {
    console.log("redoing stroke")

    let relativeIndex = strokeIndex
    console.log("inital strokeIndex before redo:", relativeIndex)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return


    ctx.clearRect(0, 0, canvas.height, canvas.width)
    const absoluteL = Histry.length
    if (absoluteL == 0) {
      console.log("no histry to redo")
      return
    }
    relativeIndex = Number(relativeIndex) + 1
    setstrokeIndex((prev) => Number(prev) + 1)
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    Histry.forEach((item, i) => {
      if (i > Number(relativeIndex)) {
        console.log("blocked due to storeindex")
        return
      }
      const color = item.color
      const width = item.width
      ctx.beginPath()
      ctx.lineWidth = Number(width)
      ctx.strokeStyle = String(color)
      ctx.moveTo(item.initial?.x, item.initial.y)

      item.intermediate.forEach((position, j) => {
        ctx.lineTo(position.x, position.y)
        ctx.stroke()
      })
      ctx.lineTo(item.final.x, item.final?.y)
      ctx.stroke()
      ctx.closePath()
    })

    console.log("final strokeIndex after redo:", relativeIndex)
  }

  // const EmitStroker = (data: any) => {
  //   socket.emit("send-stroke", data)
  //   console.log("stroke emmited to we")
  // }

  // const DrawStroke = (data: any) => {
  //   console.log("ready to draw stroke btw", data)
  //   const canvas = canvasRef.current
  //   if (!canvas) return
  //   const ctx = canvas.getContext("2d")
  //   if (!ctx) return
  //   const orginalcolor = ctx.strokeStyle
  //   const orginalwidth = ctx.lineWidth
  //   ctx.beginPath()
  //   ctx.lineWidth = Number(data.width)
  //   ctx.strokeStyle = data.color
  //   ctx.moveTo(data.initial?.x, data.initial.y)
  //
  //   data.intermediate.forEach((position: any, j: number) => {
  //     ctx.lineTo(position.x, position.y)
  //     ctx.stroke()
  //   })
  //   ctx.lineTo(data.final.x, data.final?.y)
  //   ctx.stroke()
  //   ctx.closePath()
  //   ctx.strokeStyle = orginalcolor
  //   ctx.lineWidth = orginalwidth
  // }


  useEffect(() => {
    if (!socket) {
      return
    }
    // socket.on("recieve-stroke", (data: any) => {
    //   console.log("some one drew", data)
    //   DrawStroke(data.data)
    // })

    socket.on("recieve-start-stream", (data: any) => {
      console.log("some one started drawing")
      if (!isOpponentDrawing.current) {
        isOpponentDrawing.current = true
      }
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.beginPath()
      const postion = data.data.data.inital
      console.log("postion:", postion)
      ctx.moveTo(postion.x, postion.y)
      currentStroke.initial = { x: postion.x, y: postion.y }
      ctx.strokeStyle = data.data.data.color
      ctx.lineWidth = data.data.data.width
    })

    socket.on("recieve-send-stream", (data: any) => {
      console.log("some one is drawing", data)
      if (!isOpponentDrawing.current) {
        return
      }
      // DrawStroke(data.data)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      data.data.data.forEach((res, index) => {
        ctx.lineTo(res.x, res.y)
        ctx.stroke()
        currentStroke.intermediate.push(res)
      })
    })

    socket.on("recieve-end-stream", (data: any) => {
      console.log("some one ended drawing", data)
      isOpponentDrawing.current = false
      const pos = data.data.data
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.moveTo(pos.x, pos.y)
      currentStroke.final = { x: pos.x, y: pos.y }
      const selected = ctx.strokeStyle
      const width = ctx.lineWidth
      currentStroke.width = width
      currentStroke.color = String(selected)
      ctx.closePath()
      setHistry((prev) => {
        const truncated = prev.slice(0, Number(strokeIndex) + 1)
        return [...truncated, currentStroke]
      })
      setstrokeIndex(() => Histry.length /* after truncation, i.e. new last index */)
      //
      setcurrentStroke({
        initial: null,
        intermediate: [],
        final: null,
        color: null,
        width: null
      })
    })


    return () => {
      socket.off("draw")
      socket.off("recieve-start-stream")
      socket.off("recieve-send-stream")
      socket.off("recieve-end-stream")
    }
  }, [socket])




  return (
    <>
      <div className="flex flex-col justify-center items-center h-screen">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-black touch-none"
          onPointerDown={onMouseDown}
          onPointerMove={onMouseMove}
          onPointerUp={onMouseUp}
          onPointerCancel={onMouseUp}
          onPointerLeave={onMouseUp}
        />
        <div className="grid grid-rows-2 grid-flow-col border-1 border-dark">
          {
            dummyColor.map((item, index) => {
              return <div onClick={(e) => HandelColorSelect(item)} key={item + index} className="size-8 border-1" style={{ background: item }} >
              </div>
            })
          }
        </div>
        <div className="flex gap-x-5">
          <input type="range" value={strokeSize} min={1} max={18} onChange={(e) => setstrokeSize(Number(e.currentTarget.value))} />
          <Eraser size={24} color="black"
            onClick={() => {
              HandelColorSelect(bgColor)
              console.log("hiistry:", Histry)
            }}


          />
        </div>
        <div className="flex justify-between gap-x-5 mt-5 ">

          <button onClick={HandelUndo}>
            <ArrowLeft size={24} className="hover:scale-105" />
          </button>
          <button onClick={HandelRedo}>
            <ArrowRight size={24} className="hover:scale-105" />
          </button>
          <button onClick={HandleClear}>clear</button>
        </div>

      </div >
    </>
  )

}



export default CanvasPage;
