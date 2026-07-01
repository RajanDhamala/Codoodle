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

  const localStrokeRef = useRef<Stroke>({
    initial: null,
    intermediate: [],
    final: null,
    color: null,
    width: null,
    id: null,
  })
  const activeIdref = useRef(null)
  const pointerIndexRef = useRef<number>(-1)
  const historyLengthRef = useRef(0)
  const [Histry, setHistry] = useState<Stroke[]>([])
  const remoteStrokeMapRef = useRef<Record<string, Stroke>>({})
  const dummyColor = ["red", "blue", "green", "yellow", "brown", "purple", "pink", "black"]
  const [isConnecting, setisConnecting] = useState<Boolean>(false)
  const [isConnected, setisConnected] = useState<Boolean>(false)
  const localColorRef = useRef<string>("black")
  const localWidthRef = useRef<number>(5)
  const [socket, setSocket] = useState<any>()

  const addStrokeToHistory = (stroke: Stroke) => {
    pointerIndexRef.current = historyLengthRef.current
    historyLengthRef.current++

    setHistry((prev) => {
      const updatedHistory: Stroke[] = []

      prev.forEach((item) => {
        updatedHistory.push(item)
      })

      updatedHistory.push(stroke)
      return updatedHistory
    })
  }

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
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const collectBufferedPoints = (data: Stroke) => {
    const points: Points[] = []
    const bufferIndex = bufferRef.current

    data.intermediate.forEach((position, index) => {
      if (index >= bufferIndex) {
        points.push(position)
      }
    })

    return points
  }

  const clearThrottleTimer = () => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current)
      throttleTimerRef.current = null
    }
    isActiveRef.current = false
  }

  const Thottler = (data: any) => {
    if (isActiveRef.current) {
      return
    }
    const arrayLength = data.intermediate.length

    // console.log("buufer index:", bufferIndex, "length:", arrayLength)
    const duplicated = collectBufferedPoints(data)
    const bufferLength2send = duplicated.length
    // console.log("sent length:", bufferLength2send)
    if (bufferLength2send == 0) {
      // console.log("not enough stores to emit")
      return
    }

    isActiveRef.current = true
    throttleTimerRef.current = setTimeout(() => {
      SendEventStream(duplicated)
      bufferRef.current = arrayLength
      isActiveRef.current = false
      throttleTimerRef.current = null
    }, 100)
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
    data = localStrokeRef.current
    clearThrottleTimer()

    const arrayLength = data.intermediate.length


    console.log("buufer index:", bufferRef.current, "length:", arrayLength)
    const duplicated = collectBufferedPoints(data)
    const bufferLength2send = duplicated.length
    console.log("sent length:", bufferLength2send)

    if (bufferLength2send > 0) {
      bufferRef.current = arrayLength

      socket.emit("send-stream", {
        data: duplicated,
        id: activeIdref.current
      })
    }

    isBlockedref.current = true
    socket.emit("end-stream", {
      data: data.final,
      id: activeIdref.current
    })

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

    localStrokeRef.current.initial = { x: pos.x, y: pos.y }
    ctx.strokeStyle = localColorRef.current
    ctx.lineWidth = localWidthRef.current
    const data = { color: localColorRef.current, width: localWidthRef.current, inital: { x: pos.x, y: pos.y } }
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

    const lastPoint = localStrokeRef.current.intermediate[localStrokeRef.current.intermediate.length - 1] ?? localStrokeRef.current.initial
    if (lastPoint) {
      ctx.beginPath()
      ctx.strokeStyle = localColorRef.current
      ctx.lineWidth = localWidthRef.current
      ctx.lineCap = "round"
      ctx.moveTo(lastPoint.x, lastPoint.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      ctx.closePath()
    }

    localStrokeRef.current.final = { x: pos.x, y: pos.y }
    const selected = ctx.strokeStyle
    const width = ctx.lineWidth
    localStrokeRef.current.width = width
    localStrokeRef.current.color = String(selected)
    ctx.closePath()
    const finishedStroke = { ...localStrokeRef.current }
    addStrokeToHistory(finishedStroke)
    // EmitStroker(currentStroke)
    const data = {
      final: localStrokeRef.current.final,
      color: localStrokeRef.current.color,
      width: localStrokeRef.current.width,
    }
    EndEventStream(data)
    localStrokeRef.current = {
      initial: null,
      intermediate: [],
      final: null,
      color: null,
      width: null
    }
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
    localStrokeRef.current.intermediate.push(pos)
    Thottler(localStrokeRef.current)
  }

  const HandelColorSelect = (color: string) => {
    if (isUDrawing.current) {
      isUDrawing.current = false
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    localColorRef.current = color
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.lineWidth = strokeSize
  }, [strokeSize])


  const drawStoredStroke = (ctx: CanvasRenderingContext2D, item: Stroke) => {
    if (!item.initial || !item.final) {
      return
    }

    ctx.beginPath()
    ctx.lineCap = "round"
    ctx.lineWidth = item.width ?? 5
    ctx.strokeStyle = item.color ?? "black"
    ctx.moveTo(item.initial.x, item.initial.y)

    item.intermediate.forEach((position) => {
      ctx.lineTo(position.x, position.y)
    })

    ctx.lineTo(item.final.x, item.final.y)
    ctx.stroke()
    ctx.closePath()
  }

  const redrawHistoryUntil = (targetIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    Histry.forEach((item, index) => {
      if (index <= targetIndex) {
        drawStoredStroke(ctx, item)
      }
    })

    ctx.strokeStyle = localColorRef.current
    ctx.lineWidth = localWidthRef.current
    ctx.lineCap = "round"
  }


  const HandelUndo = () => {
    const currentIndex = Math.min(pointerIndexRef.current, Histry.length - 1)
    console.log("inital strokeIndex before undo:", currentIndex)
    console.log("Ready to Undo")

    if (currentIndex <= -1) {
      console.log("no index to undo")
      pointerIndexRef.current = -1
      return
    }

    const nextIndex = currentIndex - 1
    pointerIndexRef.current = nextIndex
    redrawHistoryUntil(nextIndex)
    console.log("final strokeIndex after undo:", nextIndex)
  }

  const HandleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistry([])
    historyLengthRef.current = 0
    pointerIndexRef.current = -1
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

    const currentIndex = Math.min(pointerIndexRef.current, Histry.length - 1)
    console.log("inital strokeIndex before redo:", currentIndex)
    if (currentIndex >= Histry.length - 1) {
      console.log("no histry to redo")
      return
    }

    const nextIndex = currentIndex + 1
    pointerIndexRef.current = nextIndex
    redrawHistoryUntil(nextIndex)
    console.log("final strokeIndex after redo:", nextIndex)
  }

  const getRemoteStreamId = (data: any) => {
    return String(data.data.id ?? "remote")
  }

  const getLastStrokePoint = (stroke: Stroke) => {
    const lastIntermediate = stroke.intermediate[stroke.intermediate.length - 1]
    return lastIntermediate ?? stroke.initial
  }

  useEffect(() => {
    if (!socket) {
      return
    }

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
      const streamId = getRemoteStreamId(data)
      console.log("postion:", postion)
      ctx.moveTo(postion.x, postion.y)
      remoteStrokeMapRef.current[streamId] = {
        initial: { x: postion.x, y: postion.y },
        intermediate: [],
        final: null,
        color: data.data.data.color,
        width: Number(data.data.data.width),
        id: streamId,
      }
      ctx.strokeStyle = data.data.data.color
      ctx.lineWidth = data.data.data.width
      console.log(data.data.data.color, data.data.data.width)
    })

    socket.on("recieve-send-stream", (data: any) => {
      console.log("some one is drawing", data)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const streamId = getRemoteStreamId(data)
      const currentStroke = remoteStrokeMapRef.current[streamId]
      if (!currentStroke) return

      ctx.strokeStyle = currentStroke.color ?? "black"
      ctx.lineWidth = currentStroke.width ?? 5
      ctx.lineCap = "round"
      data.data.data.forEach((res: any) => {
        const lastPoint = getLastStrokePoint(currentStroke)
        if (!lastPoint) return
        ctx.beginPath()
        ctx.moveTo(lastPoint.x, lastPoint.y)
        ctx.lineTo(res.x, res.y)
        ctx.stroke()
        ctx.closePath()
        currentStroke.intermediate.push(res)
      })
    })

    socket.on("recieve-end-stream", (data: any) => {
      console.log("some one ended drawing", data)
      const pos = data.data.data
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const streamId = getRemoteStreamId(data)
      const currentStroke = remoteStrokeMapRef.current[streamId]
      if (!currentStroke) return

      const lastPoint = getLastStrokePoint(currentStroke)
      if (lastPoint) {
        ctx.beginPath()
        ctx.strokeStyle = currentStroke.color ?? "black"
        ctx.lineWidth = currentStroke.width ?? 5
        ctx.lineCap = "round"
        ctx.moveTo(lastPoint.x, lastPoint.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
        ctx.closePath()
      }

      currentStroke.final = { x: pos.x, y: pos.y }
      addStrokeToHistory(currentStroke)
      console.log("stroke index:", pointerIndexRef.current)
      delete remoteStrokeMapRef.current[streamId]
      isOpponentDrawing.current = Object.keys(remoteStrokeMapRef.current).length > 0
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
        // onPointerCancel={onMouseUp}
        // onPointerLeave={onMouseUp}
        />
        <div className="grid grid-rows-2 grid-flow-col border-1 border-dark">
          {
            dummyColor.map((item, index) => {
              return <div onClick={() => HandelColorSelect(item)} key={item + index} className="size-8 border-1" style={{ background: item }} >
              </div>
            })
          }
        </div>
        <div className="flex gap-x-5">
          <input type="range" value={localWidthRef.current} min={1} max={18} onChange={(e) => {
            setstrokeSize(Number(e.currentTarget.value))
            const value = Number(e.currentTarget.value)
            localWidthRef.current = value
          }} />
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
