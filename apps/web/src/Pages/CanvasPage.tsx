import { useRef, useEffect, useState } from "react";
import { Eraser, ArrowLeft, ArrowRight } from "lucide-react";


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
  }

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [bgColor, setbgColor] = useState("white")
  const [strokeSize, setstrokeSize] = useState(5)
  const [currentStroke, setcurrentStroke] = useState<Stroke>({
    initial: null,
    intermediate: [],
    final: null,
    color: null,
    width: null
  })
  const [strokeIndex, setstrokeIndex] = useState<Number>(0)

  const [Histry, setHistry] = useState<Stroke[]>([])
  const [tempHistry, settempHistry] = useState()
  const dummyColor = ["red", "blue", "green", "yellow", "brown", "purple", "pink", "black"]

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
    ctx.lineCap = "round"
  }, [])


  useEffect(() => {
    setstrokeIndex(Histry.length)
  }, [Histry])


  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    if (!isDrawing) {
      setIsDrawing(true)
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.beginPath()
    const pos = getMousePos(e)
    ctx.moveTo(pos.x, pos.y)
    currentStroke.initial = { x: pos.x, y: pos.y }
  }

  const onMouseUp = (e) => {
    if (isDrawing) {
      setIsDrawing(false)
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.closePath()
    const pos = getMousePos(e)
    ctx.moveTo(pos.x, pos.y)
    currentStroke.final = { x: pos.x, y: pos.y }
    const selected = ctx.strokeStyle
    const width = ctx.lineWidth
    currentStroke.width = width
    currentStroke.color = String(selected)
    console.log("selected width:", width)
    setHistry((prev) => {
      return [
        ...prev, currentStroke
      ]
    })
    setcurrentStroke({
      initial: null,
      intermediate: [],
      final: null,
      color: null,
      width: null
    })
  }



  const onMouseMove = (e) => {
    if (!isDrawing) {
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
  }


  const HandelColorSelect = (color) => {
    if (isDrawing) {
      setIsDrawing(false)
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

  let huhu

  const HandelUndo = (e) => {
    console.log("undoing stroke")
    // Testfxn(e)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const strokeLengh = Histry.length
    console.log("str", strokeLengh)
    settempHistry((prev) => {
      return Histry
    })
    const temp = Histry
    huhu = Histry
    // temp.pop()
    huhu.pop()
    setstrokeIndex(temp.length - 1)
    ctx.clearRect(0, 0, canvas.height, canvas.width)
    huhu.forEach((item, i) => {
      console.log("current item:", item)
      const color = item.color
      const width = item.width
      ctx.beginPath()
      ctx.lineWidth = Number(width)
      ctx.lineCap = "butt"
      ctx.strokeStyle = color
      ctx.moveTo(item.initial?.x, item.initial.y)

      item.intermediate.forEach((position, j) => {
        ctx.lineTo(position.x, position.y)
        ctx.stroke()
      })
      ctx.lineTo(item.final.x, item.final?.y)
      ctx.stroke()
      ctx.closePath()
      console.log("width:", width)
    })
  }

  // const Testfxn = (e) => {
  //   console.log("stroke histry:", Histry)
  //   const canvas = canvasRef.current
  //   if (!canvas) return
  //
  //   const ctx = canvas.getContext("2d")
  //   if (!ctx) return
  //
  //   if (Histry.length == 0) {
  //     console.log("no stroked to undo")
  //     return
  //   }
  //   ctx.clearRect(0, 0, canvas.height, canvas.width)
  //   Histry.forEach((item, i) => {
  //     console.log("current item:", item)
  //     const color = item.color
  //     const width = item.width
  //     ctx.beginPath()
  //     ctx.lineCap = width
  //     ctx.strokeStyle = color
  //     ctx.moveTo(item.initial?.x, item.initial.y)
  //
  //     item.intermediate.forEach((position, j) => {
  //       ctx.lineTo(position.x, position.y)
  //       ctx.stroke()
  //     })
  //     ctx.lineTo(item.final.x, item.final?.y)
  //     ctx.stroke()
  //     ctx.closePath()
  //   })
  // }


  const HandleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const DrawStroke = () => {
    const canavas = canvasRef.current
    if (!canavas) {
      return
    }
    const ctx = canavas.getContext("2d")
    if (!ctx) return
    const color = ctx.strokeStyle
    if (color == "white") {
      console.log("eraser selected btw")
    }
    ctx.beginPath()
    ctx.lineWidth = currentStroke.width
    ctx.strokeStyle = currentStroke.color

    ctx.moveTo(currentStroke.initial.x, currentStroke.initial.y)
    currentStroke.intermediate.forEach((item) => {
      ctx.lineTo(item.x, item.y)
      ctx.stroke()
    })

    ctx.lineTo(currentStroke.final.x, currentStroke.final.y)
    ctx.stroke()
    ctx.closePath()
  }

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };


  const HandelRedo = (e) => {
    console.log("redoing stroke")
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.height, canvas.width)
    console.log("stroke index:", strokeIndex)
    console.log("realtive length:", relativelengh)
    Histry.forEach((item, i) => {
      if (i >= strokeIndex) {
        return
      }
      console.log("current item:", item)
      const color = item.color
      const width = item.width
      ctx.beginPath()
      ctx.lineCap = width
      ctx.strokeStyle = color
      ctx.moveTo(item.initial?.x, item.initial.y)

      item.intermediate.forEach((position, j) => {
        ctx.lineTo(position.x, position.y)
        ctx.stroke()
      })
      ctx.lineTo(item.final.x, item.final?.y)
      ctx.stroke()
      ctx.closePath()
    })
    setstrokeIndex((prev) => {
      Number(prev) + 1
    })



  }

  return (
    <>
      <div className="flex flex-col justify-center items-center h-screen">
        <canvas height={500} width={500} className="border border-black" ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseMove={onMouseMove}
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
        <div className="flex justify-between gap-x-5 ">

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
